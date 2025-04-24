import { Elements, PaymentElement } from "@stripe/react-stripe-js";
import { StripeElementStyleVariant, StripePaymentElement, StripePaymentElementChangeEvent } from "@stripe/stripe-js";
import { Appearance } from "@stripe/stripe-js/dist/stripe-js/elements-group";
import cx from "classnames";
import * as React from "react";

import { SavedCreditCard } from "$app/parsers/card";
import { getStripeInstance, getRgbCssVariable } from "$app/utils/stripe_loader";
import { getCssVariable } from "$app/utils/styles";

import { requiresReusablePaymentMethod, useState } from "$app/components/Checkout/payment";
import { useFont } from "$app/components/DesignSettings";
import { Icon } from "$app/components/Icons";
import { useIsDarkTheme } from "$app/components/useIsDarkTheme";

export const CreditCardInput = ({
  disabled,
  savedCreditCard,
  invalid,
  onReady,
  useSavedCard,
  setUseSavedCard,
  onChange,
}: {
  disabled?: boolean;
  savedCreditCard: SavedCreditCard | null;
  invalid?: boolean;
  onReady: (element: StripePaymentElement) => void;
  useSavedCard: boolean;
  setUseSavedCard: (value: boolean) => void;
  amount?: number;
  setupFutureUsage?: boolean;
  setupOnly?: boolean;
  onChange?: (evt: StripePaymentElementChangeEvent) => void;
}) => {
  // Actually set font family, size, and color and determined on the first render based on a ghost div that is unmounted
  // as soon as the measurement is performed.
  const [baseStripeStyle, setBaseStripeStyle] = React.useState<null | StripeElementStyleVariant>(null);

  return (
    <fieldset className={cx({ danger: invalid })}>
      <legend>
        <label>Card information</label>
        {savedCreditCard ? (
          <button className="link" disabled={disabled} onClick={() => setUseSavedCard(!useSavedCard)}>
            {useSavedCard ? "Use a different card?" : "Use saved card"}
          </button>
        ) : null}
      </legend>
      {savedCreditCard && useSavedCard ? (
        <div className="input read-only" aria-label="Saved credit card">
          <Icon name="outline-credit-card" />
          <span>{savedCreditCard.number}</span>
          <span style={{ marginLeft: "auto" }}>{savedCreditCard.expiration_date}</span>
        </div>
      ) : (
        <div aria-label="Card information" aria-invalid={invalid}>
          {baseStripeStyle == null ? (
            <input
              ref={(el) => {
                if (el == null) return;
                const inputStyle = window.getComputedStyle(el);
                const color = getCssVariable("color").split(" ").join(",");
                const placeholderColor = `rgb(${color}, ${getCssVariable("gray-3")})`;
                setBaseStripeStyle({
                  fontFamily: inputStyle.fontFamily,
                  color: inputStyle.color,
                  iconColor: placeholderColor,
                  "::placeholder": { color: placeholderColor },
                });
              }}
            />
          ) : null}
          <PaymentElement
            className="fake-input"
            onReady={onReady}
            {...(onChange ? { onChange } : {})}
            options={{
              layout: { type: "accordion", radios: false, spacedAccordionItems: false, defaultCollapsed: false },
              fields: {
                billingDetails: { name: "never", email: "never", address: { country: "never", postalCode: "never" } },
              },
              terms: { card: "never", applePay: "never", googlePay: "never", cashapp: "never" },
            }}
          />
        </div>
      )}
    </fieldset>
  );
};

export const StripeElementsProvider = ({
  children,
  amount,
  setupFutureUsage,
  setupOnly,
}: {
  children: React.ReactNode;
  amount: number;
  setupFutureUsage: boolean;
  setupOnly: boolean;
}) => {
  const [stripePromise] = React.useState(getStripeInstance);
  const font = useFont();
  const state = useState();

  // Since Stripe Elements are rendered in iframes, we need to explicitly pass in the font source & input styles
  const stripeFonts = [{ family: font.name, src: `url(${font.url})` }];

  const isDarkTheme = useIsDarkTheme();
  const appearance: Appearance = {
    labels: "floating",
    variables: {
      colorText: getRgbCssVariable("color"),
      colorBackground: isDarkTheme ? "black" : "white",
      colorPrimary: isDarkTheme ? "white" : "black",
      colorDanger: getRgbCssVariable("danger"),
      focusOutline: "0.125rem solid #ff90e8",
      focusBoxShadow: "none",
    },
    rules: {
      ".Input": {
        borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.35)" : "black",
        borderWidth: "1px",
        borderStyle: "solid",
      },
      ".Tab": {
        borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.35)" : "black",
        borderWidth: "1px",
        borderStyle: "solid",
      },
      ".TabList": {
        borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.35)" : "black",
        borderWidth: "1px",
        borderStyle: "solid",
      },
      ".TabPanel": {
        borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.35)" : "black",
        borderWidth: "1px",
        borderStyle: "solid",
      },
      ".Block": {
        borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.35)" : "black",
        borderWidth: "1px",
        borderStyle: "solid",
      },
      ".AccordionItem": {
        borderColor: isDarkTheme ? "rgba(255, 255, 255, 0.35)" : "black",
        borderWidth: "1px",
        borderStyle: "solid",
      },
      ".AccordionItem--selected": {
        backgroundColor: isDarkTheme ? "rgba(221, 221, 221, 0.1)" : "rgba(0, 0, 0, 0.1)",
      },
      ".AccordionButton": {
        color: isDarkTheme ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
      },
      ".AccordionButton--selected": {
        color: isDarkTheme ? "white" : "black",
      },
    },
  };
  const options: {
    mode: "setup" | "payment";
    currency: "usd";
    amount: number;
    setupFutureUsage: "off_session" | null;
    paymentMethodCreation: "manual";
    fonts: { family: string; src: string }[];
    appearance: Appearance;
    paymentMethodTypes?: ["card", "link"];
  } = {
    mode: setupOnly || amount === 0 ? "setup" : "payment",
    currency: "usd",
    amount,
    setupFutureUsage: setupFutureUsage ? "off_session" : null,
    paymentMethodCreation: "manual",
    fonts: stripeFonts,
    appearance,
  };

  if (requiresReusablePaymentMethod(state[0])) options.paymentMethodTypes = ["card", "link"];

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
};
