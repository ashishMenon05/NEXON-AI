class BaseGrader:
    def _clamp(self, score: float) -> float:
        """
        Clamp score to be strictly between 0 and 1 (not exactly 0 or 1)
        """
        if score <= 0.0:
            return 0.001
        elif score >= 1.0:
            return 0.999
        return round(score, 4)
    
    def grade(self, episode_state, scenario: dict) -> float:
        """
        Returns score strictly between 0 and 1
        Must be deterministic — same inputs always same output
        """
        raise NotImplementedError("Subclasses must implement the grade method")
