export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  role: 'user' | 'admin'
  total_points: number
  created_at: string
}

export interface Match {
  id: string
  api_fixture_id: number | null
  home_team: string
  away_team: string
  home_flag: string | null
  away_flag: string | null
  match_time: string
  stage: 'group' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final'
  group_name: string | null
  venue: string | null
  status: 'scheduled' | 'live' | 'finished' | 'cancelled'
  home_score: number | null
  away_score: number | null
  is_locked: boolean
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  predicted_home: number
  predicted_away: number
  points_earned: number | null
  scored_at: string | null
  created_at: string
}

export interface LeaderboardEntry {
  id: string
  display_name: string
  avatar_url: string | null
  total_points: number
  total_predicted: number
  exact_scores: number
  correct_results: number
  wrong_predictions: number
  rank: number
}

export interface PredictionWithMatch extends Prediction {
  match: Match
}
