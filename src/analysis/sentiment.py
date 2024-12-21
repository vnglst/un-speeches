from src.models.mention import CountryMentions
from src.services.llm import LLM


class SentimentAnalyzer:
    """Analyzes UN speeches for country mentions and sentiment."""

    def __init__(self, llm: LLM):
        self.llm = llm

        self._system_prompt = (
            "You are an expert in analyzing speeches for mentions of other countries."
        )

        self._user_prompt_template = """
        Read the provided speech text carefully. Your task is to determine whether the speech is 
        optimistic or pessimistic about the country's future. Optimistic means that the speech 
        is expressing confidence that things are improving or are good. Pessimistic means that 
        the speech is expressing worry that things are getting worse or are pretty bad.

        Make sure to only include real countries' iso codes (the United Nations, continents 
        like Africa or NATO are NOT considered countries). Present your findings as a JSON 
        object with the fields 'sentiment' (either 'optimistic' or 'pessimistic') and 
        'explanation' using markdown.

        Include in the explanation quotations in English from the speech to support the 
        sentiment. Make sure to ALWAYS translate the quotations to English.

        Speech content:
        {speech_content}
        """

    def analyze_speech(self, text: str, country_code: str) -> CountryMentions:
        """
        Analyze a speech for mentions of other countries and sentiment.

        Args:
            text: The speech text to analyze
            country_code: ISO code of the speaking country

        Returns:
            List of CountryMention objects containing the analysis results
        """
        messages = [
            {"role": "system", "content": self._system_prompt},
            {
                "role": "user",
                "content": self._user_prompt_template.format(speech_content=text),
            },
        ]

        response = self.llm.generate(
            messages=messages,
            response_format=CountryMentions,
            temperature=0,
        )

        return response.mentions
