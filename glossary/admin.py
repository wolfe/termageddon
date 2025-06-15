from django.contrib import admin
from .models import Domain, Term, Definition

class AuditedAdmin(admin.ModelAdmin):
    """
    A base ModelAdmin for models that inherit from AuditedModel.
    Handles created_by, updated_by, and soft-deletion.
    """
    readonly_fields = ('created_at', 'created_by', 'updated_at', 'updated_by', 'is_deleted')

    def get_queryset(self, request):
        # Use all_objects manager to allow viewing soft-deleted items via filter
        return self.model.all_objects.all()

    def save_model(self, request, obj, form, change):
        """
        Sets created_by for new objects and updated_by for all changes.
        """
        if not change:  # i.e., creating a new object
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)

    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']  # Remove default hard-delete action
        return actions

    def soft_delete_selected(self, request, queryset):
        """Admin action to soft-delete selected items."""
        for obj in queryset:
            obj.is_deleted = True
            obj.updated_by = request.user
            obj.save()
    soft_delete_selected.short_description = "Soft delete selected items"

    def undelete_selected(self, request, queryset):
        """Admin action to restore soft-deleted items."""
        queryset.update(is_deleted=False, updated_by=request.user)
    undelete_selected.short_description = "Undelete (restore) selected items"

    actions = [soft_delete_selected, undelete_selected]
    list_filter = ['is_deleted']


@admin.register(Domain)
class DomainAdmin(AuditedAdmin):
    list_display = ('name', 'description', 'is_deleted')
    search_fields = ('name',)

@admin.register(Term)
class TermAdmin(AuditedAdmin):
    list_display = ('text', 'is_deleted')
    search_fields = ('text',)

@admin.register(Definition)
class DefinitionAdmin(AuditedAdmin):
    list_display = ('term', 'domain', 'status', 'created_by', 'is_deleted')
    list_filter = ('status', 'domain', 'is_deleted')
    search_fields = ('term__text', 'definition_text')
    ordering = ('term__text',)
    actions = AuditedAdmin.actions + ['approve_definitions']

    def approve_definitions(self, request, queryset):
        queryset.update(status='approved', updated_by=request.user)
    approve_definitions.short_description = "Mark selected definitions as approved"
