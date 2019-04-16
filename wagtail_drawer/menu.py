from wagtail.admin.wagtail_hooks import ExplorerMenuItem
from wagtail.admin.utils import user_has_any_page_permission
from wagtail.admin.navigation import get_explorable_root_page

class MenuItem(ExplorerMenuItem):
    template = 'wagtail_drawer/explorer_menu_item.html'
