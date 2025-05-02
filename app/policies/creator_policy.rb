# frozen_string_literal: true

class CreatorPolicy < ApplicationPolicy
  def export_metrics?
    user.is_team_member?
  end
end
