from django.contrib import admin
from .models import Domain, Term, Definition

@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')

@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ('text',)
    search_fields = ('text',)

@admin.register(Definition)
class DefinitionAdmin(admin.ModelAdmin):
    list_display = ('term', 'domain', 'status', 'author')
    list_filter = ('status', 'domain')
    search_fields = ('term__text', 'definition_text')
    actions = ['approve_definitions']

    def approve_definitions(self, request, queryset):
        queryset.update(status='approved')
    approve_definitions.short_description = "Mark selected definitions as approved"
