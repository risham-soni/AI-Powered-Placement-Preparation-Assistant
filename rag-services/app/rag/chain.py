import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai import errors

from app.retrieval.retriever import search, close_client
from app.rag.prompt import SYSTEM_PROMPT


load_dotenv()


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def detect_company(question):

    question_lower = question.lower()

    companies = {
        "amazon": "Amazon",
        "tcs": "TCS",
        "microsoft": "Microsoft",
        "google": "Google",
        "infosys": "Infosys",
        "accenture": "Accenture"
    }

    for company in companies:

        if company in question_lower:
            return companies[company]

    return None


def generate_answer(
    question,
    company=None,
    user_id=None
):

    if company:
        print(f"\nSelected company: {company}")
    else:
        company = detect_company(question)
        print(f"\nDetected company: {company}")

    print(f"User ID: {user_id}")

    results = search(
        question,
        limit=5,
        company=company,
        user_id=user_id
    )

    if not results:

        return {
            "answer": (
                "I could not find relevant information "
                "in the provided documents."
            ),
            "sources": []
        }

    context_parts = []

    for result in results:

        payload = result.payload

        text = payload["text"]

        page = payload["page_number"]

        document = payload.get(
            "document_name",
            "Unknown document"
        )

        result_company = payload.get(
            "company",
            "Unknown company"
        )

        context_parts.append(
            f"[Company: {result_company} | "
            f"Document: {document} | "
            f"Page: {page}]\n"
            f"{text}"
        )

    context = "\n\n".join(context_parts)

    prompt = f"""
{SYSTEM_PROMPT}

Context:
{context}

User Question:
{question}

Answer:
"""

    response = None

    for attempt in range(3):

        try:

            response = client.models.generate_content(
                model="gemini-3.7-flash",
                contents=prompt
            )

            break

        except errors.ClientError as e:

            print(
                f"Gemini API error "
                f"(attempt {attempt + 1}/3): {e}"
            )

            if (
                "429" in str(e)
                or "RESOURCE_EXHAUSTED" in str(e)
            ):

                return {
                    "answer": (
                        "Gemini API quota has been exhausted. "
                        "Please try again after the quota resets."
                    ),
                    "sources": []
                }

            return {
                "answer": (
                    "The AI service encountered an API error. "
                    "Please try again later."
                ),
                "sources": []
            }

        except errors.ServerError as e:

            print(
                f"Gemini server error "
                f"(attempt {attempt + 1}/3): {e}"
            )

            if attempt < 2:
                time.sleep(2)

    if response is None:

        return {
            "answer": (
                "The AI model is temporarily unavailable. "
                "Please try again in a few moments."
            ),
            "sources": []
        }

    unique_sources = []

    seen_sources = set()

    for result in results:

        payload = result.payload

        source = (
            payload.get(
                "company",
                "Unknown company"
            ),
            payload.get(
                "document_name",
                "Unknown document"
            ),
            payload["page_number"]
        )

        if source not in seen_sources:

            seen_sources.add(source)

            unique_sources.append({
                "company": source[0],
                "document": source[1],
                "page": source[2]
            })

    return {
        "answer": response.text,
        "sources": unique_sources
    }


if __name__ == "__main__":

    question = (
        "What DSA topics are asked "
        "in TCS interviews?"
    )

    try:

        result = generate_answer(
            question,
            user_id=None
        )

        print("\n========== ANSWER ==========")

        print(result["answer"])

        print("\n========== SOURCES ==========")

        for index, source in enumerate(
            result["sources"],
            start=1
        ):

            print(
                f"{index}. "
                f"{source['company']} | "
                f"{source['document']} | "
                f"Page {source['page']}"
            )

    finally:

        close_client()