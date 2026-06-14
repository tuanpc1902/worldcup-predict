export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  role: 'user' | 'staff' | 'admin'
  total_points: number
  created_at: string
  ip_address?: string | null
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

export interface PredictionWithMatch extends Prediction {
  matches: Match
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

export interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  match_id: string
  profiles: {
    display_name: string
    avatar_url: string | null
  }
}

export interface Group {
  id: string
  name: string
  invite_code: string
  owner_id: string
  created_at: string
  total_points: number
}

export interface FixtureRow {
  home_team: string
  away_team: string
  home_flag: string | null
  away_flag: string | null
  match_time: string
  stage: string
  group_name: string | null
  venue: string | null
  status: 'scheduled' | 'live' | 'finished' | 'cancelled'
  home_score: number | null
  away_score: number | null
  api_fixture_id: number | null
}

export interface H2HResult {
  match_id: string
  predicted_home: number
  predicted_away: number
  points_earned: number | null
  matches: {
    home_team: string
    away_team: string
    home_flag: string | null
    away_flag: string | null
    match_time: string
    home_score: number | null
    away_score: number | null
    status: string
  }
  b?: {
    match_id: string
    predicted_home: number
    predicted_away: number
    points_earned: number | null
  }
}

export interface MatchGoal {
  id: string
  match_id: string
  player_name: string
  team_name: string
  team_flag: string | null
  minute: number | null
  is_own_goal: boolean
  is_penalty: boolean
  created_at: string
}

export interface TopScorer {
  player_name: string
  team_name: string
  team_flag: string | null
  goals: number
  penalties: number
}

export interface PredictionStats {
  total: number
  homeWin: number
  draw: number
  awayWin: number
  topScores: { score: string; count: number; pct: number }[]
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
}

export interface UserAchievement {
  id: number
  user_id: string
  achievement_id: string
  awarded_at: string
  achievements: Achievement
}

export interface BracketPrediction {
  id: string
  user_id: string
  round: 'round_of_16' | 'quarter' | 'semi' | 'final' | 'champion'
  slot: number
  team_name: string
  points_earned: number | null
  created_at: string
}
