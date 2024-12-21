from openai import OpenAI


class LLM:
    def __init__(self, api_key):
        OpenAI.api_key = api_key
        self.client = OpenAI()

    def generate(
        self,
        messages,
        response_format,
        model="gpt-4o-mini",
        temperature=0,
        max_tokens=4096,
    ):
        print(f"Generating response with model {model}")

        response = self.client.beta.chat.completions.parse(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
        )
        return response.choices[0].message.parsed
