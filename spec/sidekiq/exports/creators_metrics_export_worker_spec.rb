# frozen_string_literal: true

require "spec_helper"

describe Exports::CreatorsMetricsExportWorker do
  describe "#perform" do
    let(:recipient) { create(:user) }
    
    it "generates and emails the export" do
      export_service = instance_double(Exports::CreatorsMetricsExportService)
      tempfile = instance_double(Tempfile)
      filename = "test-export.csv"
      
      allow(User).to receive(:find).with(recipient.id).and_return(recipient)
      allow(Exports::CreatorsMetricsExportService).to receive(:new).with(recipient).and_return(export_service)
      allow(export_service).to receive(:perform).and_return(
        instance_double(Exports::CreatorsMetricsExportService, tempfile: tempfile, filename: filename)
      )
      
      expect(ContactingCreatorMailer).to receive(:creators_metrics_data).with(
        recipient: recipient,
        tempfile: tempfile,
        filename: filename
      )
      
      described_class.new.perform(recipient.id)
    end
  end
end
