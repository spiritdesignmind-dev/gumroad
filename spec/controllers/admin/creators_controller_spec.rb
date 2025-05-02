# frozen_string_literal: true

require "spec_helper"

describe Admin::CreatorsController do
  describe "#export_metrics" do
    let(:team_member) { create(:user, :team_member) }
    let(:regular_user) { create(:user) }
    
    context "when user is a team member" do
      before do
        sign_in_as(team_member)
      end
      
      context "when export is processed synchronously" do
        let(:export_service) { instance_double(Exports::CreatorsMetricsExportService, tempfile: Tempfile.new, filename: "test.csv") }
        
        before do
          allow(Exports::CreatorsMetricsExportService).to receive(:export).and_return(export_service)
        end
        
        it "sends the file for download" do
          get :export_metrics
          expect(response).to be_successful
          expect(response.headers["Content-Type"]).to eq("text/csv")
          expect(response.headers["Content-Disposition"]).to include("attachment")
        end
      end
      
      context "when export is processed asynchronously" do
        before do
          allow(Exports::CreatorsMetricsExportService).to receive(:export).and_return(false)
        end
        
        it "redirects with a notice" do
          get :export_metrics
          expect(response).to redirect_to(dashboard_path)
          expect(flash[:notice]).to include("export is being generated")
        end
      end
    end
    
    context "when user is not a team member" do
      before do
        sign_in_as(regular_user)
      end
      
      it "raises an authorization error" do
        expect { get :export_metrics }.to raise_error(Pundit::NotAuthorizedError)
      end
    end
  end
end
