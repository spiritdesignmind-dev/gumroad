import * as React from "react";
import { createCast } from "ts-safe-cast";

import { register } from "$app/utils/serverComponentUtil";

import { Button } from "$app/components/Button";
import { Modal } from "$app/components/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const UpdatePayoutMethodConfirmationModal = ({ open, onClose, onConfirm }: Props) => (
  <div>
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm payout method change"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} color="primary">
            Confirm
          </Button>
        </>
      }
    >
      <h4>Changing your payout method will delay your next payout. Are you sure you want to continue?</h4>
    </Modal>
  </div>
);

export default register({ component: UpdatePayoutMethodConfirmationModal, propParser: createCast() });
