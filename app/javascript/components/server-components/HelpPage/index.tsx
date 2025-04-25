import * as React from "react";
import { useState } from "react";
import { createCast } from "ts-safe-cast";
import { register } from "$app/utils/serverComponentUtil";
import { categoryGroups } from "./category-groups";
import { Button } from "$app/components/Button";

type CategoryGroups = { [key: string]: { url: string; title: string }[] };
interface SearchState {
  flag: boolean;
  data: CategoryGroups;
  slug: string;
}

const HelpPage = ({}) => {
  const [search, setSearch] = useState<SearchState>({ flag: false, data: {}, slug: "" });

  function handleSearchInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const slug = e.target.value.toLowerCase().trim();
    if (!slug) return setSearch({ data: {}, flag: false, slug });

    let filteredGroups: CategoryGroups = {};
    for (const [category, articles] of Object.entries(categoryGroups)) {
      const lowerCategory = category.toLowerCase();

      if (lowerCategory.includes(slug)) {
        // Exact or partial match on the category name – show full group
        filteredGroups[category] = articles;
      } else {
        // Otherwise, filter article titles
        const matchingArticles = articles.filter((article) => article.title.toLowerCase().includes(slug));

        if (matchingArticles.length > 0) {
          filteredGroups[category] = matchingArticles;
        }
      }
    }

    setSearch({ data: filteredGroups, flag: true, slug });
  }

  // Function to highlight the matched part of the text
  function highlightText(txt: string, slug: string) {
    const matchIndex = txt.toLowerCase().indexOf(slug.toLowerCase());

    if (matchIndex === -1) {
      return txt; // Return the original text if no match is found
    }

    const beforeMatch = txt.substring(0, matchIndex);
    const matchedText = txt.substring(matchIndex, matchIndex + slug.length);
    const afterMatch = txt.substring(matchIndex + slug.length);

    return (
      <>
        {beforeMatch}
        <span style={{ backgroundColor: "rgb(var(--accent))" }}>{matchedText}</span>
        {afterMatch}
      </>
    );
  }

  function getSearchResultTxt(): string {
    if (search.flag === false) return "All Articles";
    const totalArticles = Object.values(search.data).reduce((acc, group) => acc + group.length, 0);
    if (totalArticles === 1) return "Found 1 article";
    else return `Found ${totalArticles} articles`;
  }

  function getNavigateUrl(url: string): string {
    return "/help" + url;
  }

  const searchData: CategoryGroups = search.flag === true ? search.data : categoryGroups;

  return (
    <main>
      <header>
        <h1>Help Center</h1>
      </header>
      <div className="pt-10">
        <div className="w-full">
          <input
            onChange={handleSearchInputChange}
            type="text"
            id="articleSearch"
            className="w-full"
            placeholder="Search articles..."
          />
        </div>

        {Object.entries(searchData).map(([category, articles]) => (
          <div key={category} className="mb-12">
            <h2 className="my-8 text-left text-2xl font-bold">{category}</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "1rem",
              }}
            >
              {articles.map((article) => (
                <Button color="filled" style={{ height: "140px", padding: 0 }}>
                  <a
                    href={getNavigateUrl(article.url)}
                    className="m-0 flex h-full w-full items-center justify-center no-underline"
                  >
                    <h3 className="text-center">{highlightText(article.title, search.slug)}</h3>
                  </a>
                </Button>
              ))}
            </div>
          </div>
        ))}

        <h2 className="mt-10 text-center">{getSearchResultTxt()} </h2>
      </div>
    </main>
  );
};

export default register({ component: HelpPage, propParser: createCast() });
