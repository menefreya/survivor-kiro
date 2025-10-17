/**
 * Get scoring rules and game mechanics
 * @route GET /api/rules/scoring
 * @access Public
 */
async function getScoringRules(req, res) {
  const rules = {
    draft_picks: {
      description: "Each player gets 2 contestants via snake draft",
      scoring: "Sum of both contestants' total scores",
      replacement_policy: "When a draft pick is eliminated, it's automatically replaced with the player's next highest-ranked available contestant"
    },
    sole_survivor: {
      description: "Each player picks one contestant to win the season",
      scoring: "Contestant's total score + episode bonus + winner bonus",
      episode_bonus: "+1 point per episode while contestant remains in current selection period",
      winner_bonus: "+50 points if contestant wins and was selected by episode 2"
    },
    elimination_predictions: {
      description: "Predict which contestant will be eliminated from each tribe per episode",
      scoring: "+3 points for each correct prediction"
    },
    elimination_compensation: {
      description: "Compensation for eliminated draft picks when no replacement is available",
      scoring: "+1 point per episode that aired AFTER the contestant was eliminated",
      trigger: "Applied when the draft replacement system cannot find an available contestant",
      example: "If contestant eliminated in episode 3 and 6 total episodes have aired, player gets +3 compensation points (episodes 4, 5, 6)"
    },
    total_score: {
      description: "Sum of all scoring categories",
      components: [
        "Draft picks total score",
        "Sole survivor total score", 
        "Sole survivor episode bonus",
        "Sole survivor winner bonus",
        "Elimination prediction bonus",
        "Elimination compensation"
      ]
    }
  };

  res.json(rules);
}

module.exports = {
  getScoringRules
};