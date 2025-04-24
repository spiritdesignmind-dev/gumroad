import { StripePaymentElement } from "@stripe/stripe-js";
import { cast } from "ts-safe-cast";

import {
  CardPaymentMethodParams,
  ReusableCardPaymentMethodParams,
  StripeErrorParams,
} from "$app/data/payment_method_params";
import { request } from "$app/utils/request";
import { getStripeInstance } from "$app/utils/stripe_loader";

import { Product } from "$app/components/Checkout/payment";

type ReusableCCVariation<CardParams extends CardPaymentMethodParams> = CardParams extends CardPaymentMethodParams
  ? ReusableCardPaymentMethodParams
  : never;

type CardData = {
  paymentElement: StripePaymentElement;
  email: string;
  name: string;
  zipCode?: string | null;
  country?: string | null;
};
export const prepareCardPaymentMethodData = async (
  cardData: CardData,
): Promise<CardPaymentMethodParams | StripeErrorParams> => {
  const stripe = await getStripeInstance();

  const paymentMethodResult = await stripe.createPaymentMethod({
    element: cardData.paymentElement,
    params: {
      billing_details: {
        name: cardData.name,
        email: cardData.email,
        address: { country: cardData.country ?? null, postal_code: cardData.zipCode ?? null },
      },
    },
  });

  if (paymentMethodResult.error) {
    return { status: "error", stripe_error: paymentMethodResult.error };
  }

  const paymentMethod = paymentMethodResult.paymentMethod;
  const wallet_type: string | null | undefined =
    paymentMethod.type === "amazon_pay"
      ? "amazon_pay"
      : paymentMethod.type === "alipay"
        ? "alipay"
        : cast(paymentMethod.card?.wallet?.type);

  return {
    status: "success",
    type: "card",
    reusable: false,
    stripe_payment_method_id: paymentMethod.id,
    stripe_payment_method_type: paymentMethod.type,
    card_country: paymentMethod.card?.country ?? null,
    card_country_source: "stripe",
    email: paymentMethod.billing_details.email,
    zip_code: paymentMethod.billing_details.address ? paymentMethod.billing_details.address.postal_code : null,
    wallet_type,
  };
};

export const confirmCardIfNeeded = async <CardParams extends CardPaymentMethodParams>(
  data: PrepareFutureChargesResponse<CardParams>,
): Promise<ReusableCCVariation<CardParams> | StripeErrorParams> => {
  const cardParams = data.cardParams;

  if (cardParams.status === "success" && data.requiresCardSetup) {
    const stripe = await getStripeInstance();
    const clientSecret = data.requiresCardSetup.client_secret;
    const confirmParams = data.requiresCardSetup.return_url ? { return_url: data.requiresCardSetup.return_url } : {};
    const result = await stripe.confirmSetup({ clientSecret, confirmParams, redirect: "if_required" });
    if (result.error) {
      return { status: "error", stripe_error: result.error };
    }
    return cardParams;
  }
  return cardParams;
};

type PrepareFutureChargesRequest<CardParams extends CardPaymentMethodParams> = {
  products: Product[];
  cardParams: CardParams;
};
type PrepareFutureChargesResponse<CardParams extends CardPaymentMethodParams> =
  | {
      cardParams: ReusableCCVariation<CardParams>;
      requiresCardSetup: false | { client_secret: string; return_url: string | null };
    }
  | {
      cardParams: StripeErrorParams;
      requiresCardSetup: false;
    };
export const prepareFutureCharges = async <CardParams extends CardPaymentMethodParams>(
  data: PrepareFutureChargesRequest<CardParams>,
): Promise<PrepareFutureChargesResponse<CardParams>> => {
  const response = await request({
    method: "POST",
    url: Routes.stripe_setup_intents_path(),
    accept: "json",
    data: { ...data.cardParams, products: data.products },
  });

  if (response.ok) {
    const responseData = cast<CreateSetupIntentSuccessResponse>(await response.json());
    return {
      cardParams: {
        ...data.cardParams,
        stripe_customer_id: responseData.reusable_token,
        stripe_setup_intent_id: responseData.setup_intent_id,
        status: "success",
        reusable: true,
      },
      requiresCardSetup:
        "requires_card_setup" in responseData
          ? { client_secret: responseData.client_secret, return_url: responseData.return_url }
          : false,
    };
  }
  const responseData = cast<CreateSetupIntentErrorResponse>(await response.json());
  return {
    cardParams: {
      stripe_error: {
        type: "api_error",
        message: responseData.error_message,
        ...(responseData.error_code ? { code: responseData.error_code } : {}),
      },
      status: "error",
    },
    requiresCardSetup: false,
  };
};
type CreateSetupIntentSuccessResponse =
  | {
      success: true;
      reusable_token: string;
      setup_intent_id: string;
      requires_card_setup: true;
      client_secret: string;
      return_url: string | null;
    }
  | { success: true; reusable_token: string; setup_intent_id: string };
type CreateSetupIntentErrorResponse = { success: false; error_message: string; error_code?: string };
