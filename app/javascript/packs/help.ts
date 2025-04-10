import ReactOnRails from "react-on-rails";

import BasePage from "$app/utils/base_page";

import HelpPage from "$app/components/server-components/HelpPage";

BasePage.initialize();
ReactOnRails.register({ HelpPage });
