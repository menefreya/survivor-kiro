import '../styles/05-components/scoring-rules.css';

const ScoringRulesCard = () => {
  return (
    <div className="scoring-rules-card">
      <div className="scoring-rules-card__header">
        <h2 className="scoring-rules-card__title">
          Scoring Breakdown
        </h2>
      </div>

      <div className="scoring-rules-card__content">
        <div className="scoring-rules-section">
          <h3 className="scoring-rules-section__title">How Your Score is Calculated</h3>
          <div className="scoring-breakdown">
            <div className="scoring-breakdown__item">
              <span className="scoring-breakdown__label">Draft Picks (2 contestants)</span>
              <span className="scoring-breakdown__description">Sum of both contestants' total scores</span>
            </div>
            <div className="scoring-breakdown__item">
              <span className="scoring-breakdown__label">Sole Survivor Pick</span>
              <span className="scoring-breakdown__description">Your chosen contestant's score</span>
            </div>
            <div className="scoring-breakdown__item">
              <span className="scoring-breakdown__label">Sole Survivor Episode Bonus</span>
              <span className="scoring-breakdown__description">+1 point per episode or +50 if pick selected by episode 2</span>
            </div>
           <div className="scoring-breakdown__item">
              <span className="scoring-breakdown__label">Final 3 Bonus</span>
              <span className="scoring-breakdown__description">+10 points if pick selected by episode 2</span>
            </div>
            <div className="scoring-breakdown__item">
              <span className="scoring-breakdown__label">Weekly Prediction Bonus</span>
              <span className="scoring-breakdown__description">+3 points per correct elimination prediction</span>
            </div>
          </div>
        </div>

        <div className="scoring-rules-section">
          <h3 className="scoring-rules-section__title">Episode Scoring Events</h3>
          <div className="scoring-events">
            <div className="scoring-event">
              <span className="scoring-event__name">Got Immunity from Shot in the Dark</span>
              <span className="scoring-event__points scoring-event__points--positive">+4</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Individual Immunity Win</span>
              <span className="scoring-event__points scoring-event__points--positive">+3</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Found Hidden Immunity Idol</span>
              <span className="scoring-event__points scoring-event__points--positive">+3</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Played Idol Successfully</span>
              <span className="scoring-event__points scoring-event__points--positive">+2</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Individual Reward Win</span>
              <span className="scoring-event__points scoring-event__points--positive">+2</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Team Immunity Win</span>
              <span className="scoring-event__points scoring-event__points--positive">+2</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Team Reward Win</span>
              <span className="scoring-event__points scoring-event__points--positive">+1</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Made Interesting Food</span>
              <span className="scoring-event__points scoring-event__points--positive">+1</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Read Tree Mail</span>
              <span className="scoring-event__points scoring-event__points--positive">+1</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Made Fire</span>
              <span className="scoring-event__points scoring-event__points--positive">+1</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Played Shot in the Dark</span>
              <span className="scoring-event__points scoring-event__points--positive">+1</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Eliminated</span>
              <span className="scoring-event__points scoring-event__points--negative">-1</span>
            </div>
            <div className="scoring-event">
              <span className="scoring-event__name">Voted Out with Idol</span>
              <span className="scoring-event__points scoring-event__points--negative">-3</span>
            </div>
          </div>
        </div>

        <div className="scoring-rules-section">
          <h3 className="scoring-rules-section__title">Sole Survivor Bonus Details</h3>
          <div className="prediction-rules">
            <div className="prediction-rule">
              <span className="prediction-rule__icon">📅</span>
              <div className="prediction-rule__content">
                <strong>Episode Bonus:</strong> Earn +1 point for each episode your current sole survivor pick remains active
              </div>
            </div>
            <div className="prediction-rule">
              <span className="prediction-rule__icon">🏆</span>
              <div className="prediction-rule__content">
                <strong>Winner Bonus:</strong> Earn +25 points if your sole survivor wins the season AND you selected them by episode 2
              </div>
            </div>
            <div className="prediction-rule">
              <span className="prediction-rule__icon">🔄</span>
              <div className="prediction-rule__content">
                <strong>Changing Picks:</strong> You can change your sole survivor if they get eliminated, but episode bonus resets
              </div>
            </div>
          </div>
        </div>

        <div className="scoring-rules-section">
          <h3 className="scoring-rules-section__title">Elimination Predictions</h3>
          <div className="prediction-rules">
            <div className="prediction-rule">
              <span className="prediction-rule__icon">🎯</span>
              <div className="prediction-rule__content">
                <strong>Weekly Predictions:</strong> Predict who will be eliminated from each tribe before episodes air
              </div>
            </div>
            <div className="prediction-rule">
              <span className="prediction-rule__icon">⏰</span>
              <div className="prediction-rule__content">
                <strong>Deadline:</strong> Predictions must be submitted before the episode airs
              </div>
            </div>
            <div className="prediction-rule">
              <span className="prediction-rule__icon">✅</span>
              <div className="prediction-rule__content">
                <strong>Scoring:</strong> Earn +3 points for each correct elimination prediction
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoringRulesCard;