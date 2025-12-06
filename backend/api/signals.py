from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    When a Django User is created (via Kinde login),
    also create a UserProfile storing the user's Kinde ID.
    """
    if created:
        UserProfile.objects.create(
            user=instance,
            kinde_id=instance.username  # We store Kinde ID in username
        )
