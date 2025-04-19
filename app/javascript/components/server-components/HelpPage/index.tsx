import * as React from "react";
import { createCast } from "ts-safe-cast";
import { register } from "$app/utils/serverComponentUtil";
import { categoryGroups } from "./category-groups";
import { Button } from "$app/components/Button";

const HelpPage = ({}: {}) => {
  return (
    <main>
      <header>
        <h1>Help</h1>
      </header>
      <div className="pt-10">
        <div className="w-full">
          <input type="text" id="articleSearch" className="w-full" placeholder="Search articles..." />
        </div>

        {Object.entries(categoryGroups).map(([category, articles]) => (
          <div key={category} className="mb-12">
            <h2 className="my-8 text-left text-2xl font-bold">{category}</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "1rem",
              }}
            >
              {articles.map((txt) => (
                <Button color="filled" style={{ height: "120px" }}>
                  <h3 className="text-center">{txt}</h3>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};

export default register({ component: HelpPage, propParser: createCast() });
