import cx from "classnames";
import * as React from "react";
import { cast, createCast } from "ts-safe-cast";

import { SettingPage } from "$app/parsers/settings";
import { asyncVoid } from "$app/utils/promise";
import { ResponseError, request, assertResponseError } from "$app/utils/request";
import { register } from "$app/utils/serverComponentUtil";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { Modal } from "$app/components/Modal";
import { NumberInput } from "$app/components/NumberInput";
import { showAlert } from "$app/components/server-components/Alert";
import { ToggleSettingRow } from "$app/components/SettingRow";
import { Layout } from "$app/components/Settings/Layout";
import { TagInput } from "$app/components/TagInput";
import { Toggle } from "$app/components/Toggle";

const NEW_REPLY_TO_EMAIL_ID_PREFIX = "__REPLY_TO_EMAIL";

type ReplyToEmail = {
  id: number | string; // new emails will have a string ID starting with NEW_REPLY_TO_EMAIL_ID_PREFIX
  email: string;
  product_ids: string[];
};

type Props = {
  settings_pages: SettingPage[];
  is_form_disabled: boolean;
  invalidate_active_sessions: boolean;
  ios_app_store_url: string;
  android_app_store_url: string;
  timezones: { name: string; offset: string }[];
  currencies: { name: string; code: string }[];
  user: {
    email: string | null;
    support_email: string | null;
    locale: string;
    timezone: string;
    currency_type: string;
    has_unconfirmed_email: boolean;
    compliance_country: string | null;
    purchasing_power_parity_enabled: boolean;
    purchasing_power_parity_limit: number | null;
    purchasing_power_parity_payment_verification_disabled: boolean;
    products: { id: string; name: string }[];
    purchasing_power_parity_excluded_product_ids: string[];
    enable_payment_email: boolean;
    enable_payment_push_notification: boolean;
    enable_recurring_subscription_charge_email: boolean;
    enable_recurring_subscription_charge_push_notification: boolean;
    enable_free_downloads_email: boolean;
    enable_free_downloads_push_notification: boolean;
    announcement_notification_enabled: boolean;
    disable_comments_email: boolean;
    disable_reviews_email: boolean;
    show_nsfw_products: boolean;
    seller_refund_policy: {
      enabled: boolean;
      allowed_refund_periods_in_days: { key: number; value: string }[];
      max_refund_period_in_days: number;
      fine_print_enabled: boolean;
      fine_print: string | null;
    };
    reply_to_emails: ReplyToEmail[];
  };
};

const AddReplyToEmailButton = ({ addNewReplyToEmail }: { addNewReplyToEmail: () => void }) => (
  <Button color="primary" onClick={() => addNewReplyToEmail()}>
    <Icon name="plus" />
    Add reply-to email
  </Button>
);

const ReplyToEmailRow = ({
  replyToEmail,
  userSettings,
  updateUserSettings,
}: {
  replyToEmail: ReplyToEmail;
  userSettings: Props["user"];
  updateUserSettings: (user: Props["user"]) => void;
}) => {
  const uid = React.useId();
  const [expanded, setExpanded] = React.useState(!!replyToEmail.id.toString().startsWith(NEW_REPLY_TO_EMAIL_ID_PREFIX));
  const updateReplyToEmail = (update: Partial<ReplyToEmail>) => {
    const replyToEmailIndex = userSettings.reply_to_emails.findIndex(({ id }) => id === replyToEmail.id);
    updateUserSettings({
      ...userSettings,
      reply_to_emails: [
        ...userSettings.reply_to_emails.slice(0, replyToEmailIndex),
        { ...replyToEmail, ...update },
        ...userSettings.reply_to_emails.slice(replyToEmailIndex + 1),
      ],
    });
  };

  return (
    <div role="listitem">
      <div className="content">
        <Icon name="code-square" className="type-icon" />
        <div>
          <h4>{replyToEmail.email || "No email set"}</h4>
        </div>
      </div>
      <div className="actions">
        <Button onClick={() => setExpanded((prevExpanded) => !prevExpanded)} aria-label="Edit snippet">
          {expanded ? <Icon name="outline-cheveron-up" /> : <Icon name="outline-cheveron-down" />}
        </Button>
        <Button
          onClick={() =>
            updateUserSettings({
              ...userSettings,
              reply_to_emails: userSettings.reply_to_emails.filter(({ id }) => id !== replyToEmail.id),
            })
          }
          aria-label="Delete email"
        >
          <Icon name="trash2" />
        </Button>
      </div>
      {expanded ? (
        <div className="paragraphs">
          <fieldset>
            <label htmlFor={`${uid}email`}>Email</label>
            <input
              id={`${uid}email`}
              type="email"
              value={replyToEmail.email}
              onChange={(evt) => updateReplyToEmail({ email: evt.target.value })}
            />
          </fieldset>
          <fieldset>
            <legend>
              <label htmlFor={`${uid}-products`}>Products</label>
            </legend>
            <TagInput
              inputId={`${uid}-products`}
              tagIds={replyToEmail.product_ids}
              tagList={userSettings.products.map(({ id, name }) => ({ id, label: name }))}
              onChangeTagIds={(productIds) => updateReplyToEmail({ product_ids: productIds })}
            />
          </fieldset>
        </div>
      ) : null}
    </div>
  );
};

const MainPage = (props: Props) => {
  const uid = React.useId();
  const [formErrors, setFormErrors] = React.useState<Record<"email", boolean>>({
    email: false,
  });
  const [userSettings, setUserSettings] = React.useState<Props["user"]>({
    ...props.user,
    email: props.user.email ?? "",
    support_email: props.user.support_email ?? "",
    purchasing_power_parity_excluded_product_ids: props.user.purchasing_power_parity_excluded_product_ids,
  });
  const updateUserSettings = (settings: Partial<typeof userSettings>) =>
    setUserSettings((prev) => ({ ...prev, ...settings }));

  const addNewReplyToEmail = React.useCallback(() => {
    updateUserSettings({
      reply_to_emails: [
        ...userSettings.reply_to_emails,
        { id: `${NEW_REPLY_TO_EMAIL_ID_PREFIX}${Math.random()}`, email: "", product_ids: [] },
      ],
    });
  }, [userSettings]);

  const [isResendingConfirmationEmail, setIsResendingConfirmationEmail] = React.useState(false);
  const [resentConfirmationEmail, setResentConfirmationEmail] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const emailInputRef = React.useRef<HTMLInputElement>(null);

  const resendConfirmationEmail = async () => {
    setIsResendingConfirmationEmail(true);

    try {
      const response = await request({
        url: Routes.resend_confirmation_email_settings_main_path(),
        method: "POST",
        accept: "json",
      });
      const responseData = cast<{ success: boolean }>(await response.json());
      if (!responseData.success) throw new ResponseError();
      showAlert("Confirmation email resent!", "success");
      setResentConfirmationEmail(true);
    } catch (e) {
      assertResponseError(e);
      showAlert("Sorry, something went wrong. Please try again.", "error");
    }

    setIsResendingConfirmationEmail(false);
  };

  const onSave = asyncVoid(async () => {
    if (props.is_form_disabled) return;

    if (userSettings.email === "") {
      showAlert("Please enter an email address!", "error");
      setFormErrors((prev) => ({ ...prev, email: true }));
      emailInputRef.current?.focus();
      return;
    }

    setIsSaving(true);

    try {
      const response = await request({
        url: Routes.settings_main_path(),
        method: "PUT",
        accept: "json",
        data: {
          user: {
            ...userSettings,
            reply_to_emails: userSettings.reply_to_emails.map((replyToEmail) => ({
              id:
                replyToEmail.id && !replyToEmail.id.toString().startsWith(NEW_REPLY_TO_EMAIL_ID_PREFIX)
                  ? replyToEmail.id
                  : null,
              email: replyToEmail.email,
              product_ids: replyToEmail.product_ids,
            })),
          },
        },
      });
      const responseData = cast<{ success: true } | { success: false; error_message: string }>(await response.json());
      if (responseData.success) {
        showAlert("Your account has been updated!", "success");
      } else {
        showAlert(responseData.error_message, "error");
      }
    } catch (e) {
      assertResponseError(e);
      showAlert("Sorry, something went wrong. Please try again.", "error");
    }

    setIsSaving(false);
  });

  return (
    <Layout
      currentPage="main"
      pages={props.settings_pages}
      onSave={onSave}
      canUpdate={!props.is_form_disabled && !isSaving}
    >
      <form>
        <section>
          <header>
            <h2>User details</h2>
          </header>
          <fieldset>
            <legend>
              <label htmlFor={`${uid}-email`}>Email</label>
            </legend>
            <input
              type="email"
              id={`${uid}-email`}
              ref={emailInputRef}
              value={userSettings.email ?? ""}
              disabled={props.is_form_disabled}
              aria-invalid={formErrors.email}
              onChange={(e) => updateUserSettings({ email: e.target.value })}
            />
            {props.user.has_unconfirmed_email && !props.is_form_disabled ? (
              <small>
                This email address has not been confirmed yet.{" "}
                {resentConfirmationEmail ? null : (
                  <button
                    className="link"
                    onClick={(e) => {
                      e.preventDefault();
                      void resendConfirmationEmail();
                    }}
                  >
                    {isResendingConfirmationEmail ? "Resending..." : "Resend confirmation?"}
                  </button>
                )}
              </small>
            ) : null}
          </fieldset>
        </section>
        <section>
          <header>
            <h2>Notifications</h2>
            <div>
              Depending on your preferences, you can choose whether to receive mobile notifications or email
              notifications. If you want to get notifications on a mobile device, install the Gumroad app over on the{" "}
              <a href={props.ios_app_store_url} target="_blank" rel="noopener noreferrer">
                App Store
              </a>{" "}
              or{" "}
              <a href={props.android_app_store_url} target="_blank" rel="noopener noreferrer">
                Play Store
              </a>
              .
            </div>
          </header>
          <fieldset>
            <table>
              <thead>
                <tr>
                  <th>Notifications</th>
                  <th>Email</th>
                  <th>Mobile</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Purchases</th>
                  <td data-label="Email">
                    <Toggle
                      value={userSettings.enable_payment_email}
                      onChange={(value) => updateUserSettings({ enable_payment_email: value })}
                      disabled={props.is_form_disabled}
                    />
                  </td>
                  <td data-label="Mobile">
                    <Toggle
                      value={userSettings.enable_payment_push_notification}
                      onChange={(value) => updateUserSettings({ enable_payment_push_notification: value })}
                      disabled={props.is_form_disabled}
                    />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Recurring payments</th>
                  <td data-label="Email">
                    <Toggle
                      value={userSettings.enable_recurring_subscription_charge_email}
                      onChange={(value) => updateUserSettings({ enable_recurring_subscription_charge_email: value })}
                      disabled={props.is_form_disabled}
                    />
                  </td>
                  <td data-label="Mobile">
                    <Toggle
                      value={userSettings.enable_recurring_subscription_charge_push_notification}
                      onChange={(value) =>
                        updateUserSettings({
                          enable_recurring_subscription_charge_push_notification: value,
                        })
                      }
                      disabled={props.is_form_disabled}
                    />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Free downloads</th>
                  <td data-label="Email">
                    <Toggle
                      value={userSettings.enable_free_downloads_email}
                      onChange={(value) => updateUserSettings({ enable_free_downloads_email: value })}
                      disabled={props.is_form_disabled}
                    />
                  </td>
                  <td data-label="Mobile">
                    <Toggle
                      value={userSettings.enable_free_downloads_push_notification}
                      onChange={(value) => updateUserSettings({ enable_free_downloads_push_notification: value })}
                      disabled={props.is_form_disabled}
                    />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Personalized product announcements</th>
                  <td data-label="Email">
                    <Toggle
                      value={userSettings.announcement_notification_enabled}
                      onChange={(value) => updateUserSettings({ announcement_notification_enabled: value })}
                      disabled={props.is_form_disabled}
                    />
                  </td>
                  <td data-label="Mobile"></td>
                </tr>
                <tr>
                  <th scope="row">Comments</th>
                  <td data-label="Email">
                    <Toggle
                      value={!userSettings.disable_comments_email}
                      onChange={(value) => updateUserSettings({ disable_comments_email: !value })}
                      disabled={props.is_form_disabled}
                    />
                  </td>
                  <td data-label="Mobile"></td>
                </tr>
                <tr>
                  <th scope="row">Reviews</th>
                  <td data-label="Email">
                    <Toggle
                      value={!userSettings.disable_reviews_email}
                      onChange={(value) => updateUserSettings({ disable_reviews_email: !value })}
                      disabled={props.is_form_disabled}
                      ariaLabel="Reviews"
                    />
                  </td>
                  <td data-label="Mobile"></td>
                </tr>
              </tbody>
            </table>
          </fieldset>
        </section>
        <section>
          <header>
            <h2>Support</h2>
          </header>
          <fieldset>
            <legend>
              <label htmlFor={`${uid}-support-email`}>Email</label>
            </legend>
            <input
              type="email"
              id={`${uid}-support-email`}
              value={userSettings.support_email ?? ""}
              placeholder={props.user.email ?? ""}
              disabled={props.is_form_disabled}
              onChange={(e) => updateUserSettings({ support_email: e.target.value })}
            />
            <small>This email is listed on the receipt of every sale.</small>

            {userSettings.reply_to_emails.length > 0 ? (
              <>
                <div className="rows" role="list">
                  {userSettings.reply_to_emails.map((reply_to_email) => (
                    <ReplyToEmailRow
                      key={reply_to_email.id}
                      replyToEmail={reply_to_email}
                      userSettings={userSettings}
                      updateUserSettings={updateUserSettings}
                    />
                  ))}
                </div>
                <AddReplyToEmailButton addNewReplyToEmail={addNewReplyToEmail} />
              </>
            ) : (
              <div className="placeholder">
                <AddReplyToEmailButton addNewReplyToEmail={addNewReplyToEmail} />
              </div>
            )}
          </fieldset>
        </section>
        {props.user.seller_refund_policy.enabled ? (
          <section>
            <header>
              <h2>Refund policy</h2>
              <div>Choose how refunds will be handled for your products.</div>
            </header>
            <fieldset>
              <legend>
                <label htmlFor="max-refund-period-in-days">Refund period</label>
              </legend>
              <select
                id="max-refund-period-in-days"
                value={userSettings.seller_refund_policy.max_refund_period_in_days}
                disabled={props.is_form_disabled}
                onChange={(e) =>
                  updateUserSettings({
                    seller_refund_policy: {
                      ...userSettings.seller_refund_policy,
                      max_refund_period_in_days: Number(e.target.value),
                    },
                  })
                }
              >
                {userSettings.seller_refund_policy.allowed_refund_periods_in_days.map(({ key, value }) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </fieldset>
            <fieldset>
              <ToggleSettingRow
                value={
                  userSettings.seller_refund_policy.fine_print_enabled
                    ? userSettings.seller_refund_policy.max_refund_period_in_days > 0
                    : false
                }
                onChange={(value) =>
                  updateUserSettings({
                    seller_refund_policy: {
                      ...userSettings.seller_refund_policy,
                      fine_print_enabled: value,
                    },
                  })
                }
                disabled={props.is_form_disabled || userSettings.seller_refund_policy.max_refund_period_in_days === 0}
                label="Add a fine print to your refund policy"
                dropdown={
                  <fieldset>
                    <legend>
                      <label htmlFor="seller-refund-policy-fine-print">Fine print</label>
                    </legend>
                    <textarea
                      id="seller-refund-policy-fine-print"
                      maxLength={3000}
                      rows={10}
                      value={userSettings.seller_refund_policy.fine_print || ""}
                      placeholder="Describe your refund policy"
                      disabled={props.is_form_disabled}
                      onChange={(e) =>
                        updateUserSettings({
                          seller_refund_policy: {
                            ...userSettings.seller_refund_policy,
                            fine_print: e.target.value,
                          },
                        })
                      }
                    />
                  </fieldset>
                }
              />
            </fieldset>
          </section>
        ) : null}
        <section>
          <header>
            <h2>Local</h2>
          </header>
          <fieldset>
            <legend>
              <label htmlFor={`${uid}-timezone`}>Time zone</label>
            </legend>
            <select
              id={`${uid}-timezone`}
              disabled={props.is_form_disabled}
              value={userSettings.timezone}
              onChange={(e) => updateUserSettings({ timezone: e.target.value })}
            >
              {props.timezones.map((tz) => (
                <option key={tz.name} value={tz.name}>
                  {`${tz.offset} | ${tz.name}`}
                </option>
              ))}
            </select>
          </fieldset>
          <fieldset>
            <legend>
              <label htmlFor={`${uid}-local-currency`}>Sell in...</label>
            </legend>
            <select
              id={`${uid}-local-currency`}
              disabled={props.is_form_disabled}
              value={userSettings.currency_type}
              onChange={(e) => updateUserSettings({ currency_type: e.target.value })}
            >
              {props.currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.name}
                </option>
              ))}
            </select>
            <small>Applies only to new products.</small>
            <small>
              Charges will happen in USD, using an up-to-date exchange rate. Customers may incur an additional foreign
              transaction fee according to their cardmember agreement.
            </small>
          </fieldset>
          <fieldset>
            <ToggleSettingRow
              value={userSettings.purchasing_power_parity_enabled}
              onChange={(value) => updateUserSettings({ purchasing_power_parity_enabled: value })}
              disabled={props.is_form_disabled}
              label="Enable purchasing power parity"
              dropdown={
                <div className="paragraphs">
                  <fieldset>
                    <legend>
                      <label htmlFor={`${uid}-ppp-discount-percentage`}>Maximum PPP discount</label>
                    </legend>
                    <div className={cx("input", { disabled: props.is_form_disabled })}>
                      <NumberInput
                        value={userSettings.purchasing_power_parity_limit}
                        onChange={(value) => {
                          if (value === null || (value > 0 && value <= 100)) {
                            updateUserSettings({ purchasing_power_parity_limit: value });
                          }
                        }}
                      >
                        {(inputProps) => (
                          <input
                            id={`${uid}-ppp-discount-percentage`}
                            type="text"
                            placeholder="60"
                            disabled={props.is_form_disabled}
                            aria-label="Percentage"
                            {...inputProps}
                          />
                        )}
                      </NumberInput>
                      <div className="pill">%</div>
                    </div>
                  </fieldset>
                  <Toggle
                    value={!userSettings.purchasing_power_parity_payment_verification_disabled}
                    disabled={props.is_form_disabled}
                    onChange={(newValue) =>
                      updateUserSettings({ purchasing_power_parity_payment_verification_disabled: !newValue })
                    }
                  >
                    Apply only if the customer is currently located in the country of their payment method
                  </Toggle>
                  <fieldset>
                    <legend>
                      <label htmlFor={`${uid}-ppp-exclude-products`}>Products to exclude</label>
                    </legend>

                    <TagInput
                      inputId={`${uid}-ppp-exclude-products`}
                      tagIds={userSettings.purchasing_power_parity_excluded_product_ids}
                      tagList={props.user.products.map(({ id, name }) => ({ id, label: name }))}
                      isDisabled={props.is_form_disabled}
                      onChangeTagIds={(productIds) =>
                        updateUserSettings({ purchasing_power_parity_excluded_product_ids: productIds })
                      }
                    />

                    <label>
                      <input
                        type="checkbox"
                        disabled={props.is_form_disabled}
                        checked={
                          userSettings.purchasing_power_parity_excluded_product_ids.length ===
                          props.user.products.length
                        }
                        onChange={(evt) =>
                          updateUserSettings({
                            purchasing_power_parity_excluded_product_ids: evt.target.checked
                              ? props.user.products.map(({ id }) => id)
                              : [],
                          })
                        }
                      />
                      All products
                    </label>
                  </fieldset>
                </div>
              }
            />
            <small>
              Charge customers different amounts depending on the cost of living in their country.{" "}
              <a data-helper-prompt="Can you explain more about purchasing power parity?">Learn more</a>
            </small>
          </fieldset>
        </section>
        <section>
          <header>
            <h2>Adult content</h2>
          </header>
          <fieldset>
            <ToggleSettingRow
              value={userSettings.show_nsfw_products}
              onChange={(value) => updateUserSettings({ show_nsfw_products: value })}
              disabled={props.is_form_disabled}
              label="Show adult content in recommendations and search results"
            />
          </fieldset>
        </section>
        {props.invalidate_active_sessions ? <InvalidateActiveSessionsSection /> : null}
      </form>
    </Layout>
  );
};

const InvalidateActiveSessionsSection = () => {
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = React.useState(false);
  const [isInvalidating, setIsInvalidating] = React.useState(false);

  const invalidateActiveSessions = asyncVoid(async () => {
    setIsInvalidating(true);

    try {
      await request({ url: Routes.user_invalidate_active_sessions_path(), method: "PUT", accept: "json" });

      location.reload();
    } catch (e) {
      assertResponseError(e);
      showAlert("Sorry, something went wrong. Please try again.", "error");
    }

    setIsConfirmationDialogOpen(false);
    setIsInvalidating(false);
  });

  return (
    <section>
      <fieldset>
        <button className="link" type="button" onClick={() => setIsConfirmationDialogOpen(true)}>
          Sign out from all active sessions
        </button>
        <small>You will be signed out from all your active sessions including this session.</small>
      </fieldset>
      {isConfirmationDialogOpen ? (
        <Modal
          open
          title="Sign out from all active sessions"
          onClose={() => !isInvalidating && setIsConfirmationDialogOpen(false)}
          footer={
            <>
              <Button onClick={() => setIsConfirmationDialogOpen(false)} disabled={isInvalidating}>
                Cancel
              </Button>
              <Button color="accent" onClick={() => invalidateActiveSessions()} disabled={isInvalidating}>
                {isInvalidating ? "Signing out from all active sessions..." : "Yes, sign out"}
              </Button>
            </>
          }
        >
          Are you sure that you would like to sign out from all active sessions? You will be signed out from this
          session as well.
        </Modal>
      ) : null}
    </section>
  );
};

export default register({ component: MainPage, propParser: createCast() });
