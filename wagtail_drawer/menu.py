from wagtail.admin.wagtail_hooks import ExplorerMenuItem


class MenuItem(ExplorerMenuItem):
    template = "wagtail_drawer/explorer_menu_item.html"
