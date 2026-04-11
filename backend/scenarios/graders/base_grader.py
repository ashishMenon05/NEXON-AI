class BaseGrader:
    def _clamp_score(self, score: float) -> float:
        """
        Clamp score to (0, 1) range - strictly between 0 and 1
        """
        if score <= 0.0:
            score = 0.001
        elif score >= 1.0:
            score = 0.999
        return round(score, 4)
    
    def grade(self, episode_state, scenario: dict) -> float:
        """
        Returns score strictly between 0.0 and 1.0
        Must be deterministic — same inputs always same output
        """
        raise NotImplementedError("Subclasses must implement the grade method")
