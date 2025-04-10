import * as React from "react";
import { createCast } from "ts-safe-cast";
import { register } from "$app/utils/serverComponentUtil";
import { useLoggedInUser } from "$app/components/LoggedInUser";

const HelpPage = ({}: {}) => {
  const loggedInUser = useLoggedInUser();

  if (!loggedInUser) return <p>Pls Login</p>;

  return (
    <main>
      <header>
        <h1>Help</h1>
      </header>
    </main>
  );
};

export default register({ component: HelpPage, propParser: createCast() });
