import factory
from django.contrib.auth.models import User
from factory.django import DjangoModelFactory
from faker import Faker

from glossary.models import (
    Comment,
    Perspective,
    PerspectiveCurator,
    Entry,
    EntryDraft,
    Term,
)

fake = Faker()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_staff = False
    is_active = True


class PerspectiveFactory(DjangoModelFactory):
    class Meta:
        model = Perspective

    name = factory.Sequence(lambda n: f"Perspective {n}")
    description = factory.Faker("text", max_nb_chars=200)
    created_by = factory.SubFactory(UserFactory)


class TermFactory(DjangoModelFactory):
    class Meta:
        model = Term

    text = factory.Sequence(lambda n: f"Term {n}")
    is_official = False
    created_by = factory.SubFactory(UserFactory)


class EntryFactory(DjangoModelFactory):
    class Meta:
        model = Entry

    term = factory.SubFactory(TermFactory)
    perspective = factory.SubFactory(PerspectiveFactory)
    is_official = False
    created_by = factory.SubFactory(UserFactory)


class EntryDraftFactory(DjangoModelFactory):
    class Meta:
        model = EntryDraft

    entry = factory.SubFactory(EntryFactory)
    content = factory.Faker("text", max_nb_chars=500)
    author = factory.SubFactory(UserFactory)
    created_by = factory.SubFactory(UserFactory)


class CommentFactory(DjangoModelFactory):
    class Meta:
        model = Comment

    text = factory.Faker("text", max_nb_chars=200)
    author = factory.SubFactory(UserFactory)
    created_by = factory.SubFactory(UserFactory)
    content_object = factory.SubFactory(EntryFactory)


class PerspectiveCuratorFactory(DjangoModelFactory):
    class Meta:
        model = PerspectiveCurator

    user = factory.SubFactory(UserFactory)
    perspective = factory.SubFactory(PerspectiveFactory)
    assigned_by = factory.SubFactory(UserFactory)
    created_by = factory.SubFactory(UserFactory)
