// NOTE: keep in sync with lib/utilities/card_type.rb
export type CreditCardType =
  | "discover"
  | "generic_card"
  | "visa"
  | "amex"
  | "mastercard"
  | "jcb"
  | "diners"
  | "unionpay";

export type SavedCreditCard = {
  type: CreditCardType;
  number: string | null;
  expiration_date: string | null;
  requires_mandate: boolean;
};
