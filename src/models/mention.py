from typing import List

from pydantic import BaseModel, Field


class CountryMention(BaseModel):
    country: str = Field(..., description="Country name")
    country_code: str = Field(..., description="ISO code")
    sentiment: str = Field(..., description="optimistic/pessimistic")
    explanation: str = Field(..., description="Analysis explanation")


class CountryMentions(BaseModel):
    mentions: List[CountryMention] = Field(
        ...,
        description="An array of objects representing the country mentions and their sentiments.",
    )
