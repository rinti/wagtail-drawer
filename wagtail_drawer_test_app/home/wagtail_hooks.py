from django.urls import reverse
from django.utils.translation import ugettext_lazy as _
from wagtail.core import hooks

from wagtail_drawer.menu import DrawerMenuItem
from wagtail.admin.wagtail_hooks import ExplorerMenuItem


@hooks.register("register_admin_menu_item")
def register_explorer_menu_item():
    return DrawerMenuItem(
        _("Drawer"),
        reverse("wagtailadmin_explore_root"),
        name="explorer",
        classnames="icon icon-folder-open-inverse",
        order=10,
    )
