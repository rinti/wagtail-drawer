from wagtail.admin.wagtail_hooks import ExplorerMenuItem


class DrawerMenuItem(ExplorerMenuItem):
    template = "wagtail_drawer/explorer_menu_item.html"

    @property	
    def media(self):	
        return forms.Media(js=[static('wagtail_drawer/js/drawer-menu.js')])
