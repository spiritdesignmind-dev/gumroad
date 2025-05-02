import axios from "axios";
import * as React from "react";
import { useState } from "react";

type ReportButtonProps = {
  productId: string;
};

export default function ReportButton({ productId }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("impersonation");
  const [description, setDescription] = useState("");
  const [originalProductId, setOriginalProductId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await axios.post(`/products/${productId}/reports`, {
        reason,
        description,
        original_product_id: originalProductId || undefined,
      });

      setMessage(response.data.message);
      setIsOpen(false);
    } catch (_error) {
      setMessage("Error submitting report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)} className="text-red-600 text-sm hover:underline">
        Report impersonation
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Report product</h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="mb-2 block">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded border p-2"
                >
                  <option value="impersonation">Impersonation</option>
                  <option value="copyright_violation">Copyright violation</option>
                  <option value="content_violation">Content violation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="mb-2 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border p-2"
                  required
                  rows={4}
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block">Original product URL/ID (if known)</label>
                <input
                  type="text"
                  value={originalProductId}
                  onChange={(e) => setOriginalProductId(e.target.value)}
                  className="w-full rounded border p-2"
                />
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => setIsOpen(false)} className="mr-2 rounded border px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-red-600 rounded px-4 py-2 text-white">
                  {isSubmitting ? "Submitting..." : "Submit report"}
                </button>
              </div>
            </form>

            {message ? <p className="mt-4 text-center">{message}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
