import os
import time

from dotenv import load_dotenv

from google import genai

from app.retrieval.retriever import (
    search,
    close_client
)

from app.rag.prompt import SYSTEM_PROMPT


# ==================================
# LOAD ENVIRONMENT VARIABLES
# ==================================

load_dotenv()


# ==================================
# GEMINI CLIENT
# ==================================

client = genai.Client(
    api_key=os.getenv(
        "GEMINI_API_KEY"
    )
)


# ==================================
# COMPANY DETECTION
# ==================================

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


# ==================================
# BUILD SOURCES
# ==================================

def build_sources(results):

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

            payload.get(
                "page_number",
                "Unknown"
            )

        )

        if source not in seen_sources:

            seen_sources.add(
                source
            )

            unique_sources.append({

                "company":
                    source[0],

                "document":
                    source[1],

                "page":
                    source[2]

            })

    return unique_sources


# ==================================
# RETRIEVAL FALLBACK
# ==================================

def build_retrieval_fallback(
    results
):

    fallback_parts = []

    seen_text = set()

    for result in results:

        payload = result.payload

        company = payload.get(
            "company",
            "Unknown company"
        )

        document = payload.get(
            "document_name",
            "Unknown document"
        )

        page = payload.get(
            "page_number",
            "Unknown"
        )

        text = payload.get(
            "text",
            ""
        ).strip()


        if not text:
            continue


        text_key = " ".join(
            text.split()
        ).lower()


        if text_key in seen_text:
            continue


        seen_text.add(
            text_key
        )


        fallback_parts.append(

            f"Source "
            f"{len(fallback_parts) + 1}\n"

            f"Company: {company}\n"

            f"Document: {document}\n"

            f"Page: {page}\n\n"

            f"{text}"

        )


    if not fallback_parts:

        return (
            "The AI generation service is "
            "temporarily unavailable, and no "
            "relevant document content could "
            "be retrieved."
        )


    return (

        "The AI generation service is "
        "temporarily unavailable. Here is "
        "the relevant information retrieved "
        "from your selected document:\n\n"

        +

        "\n\n--------------------\n\n".join(
            fallback_parts
        )

    )


# ==================================
# MAIN RAG FUNCTION
# ==================================

def generate_answer(

    question,

    company=None,

    user_id=None,

    document_name=None

):


    # ==================================
    # COMPANY
    # ==================================

    if company:

        print(
            f"\nSelected company: "
            f"{company}"
        )

    else:

        company = detect_company(
            question
        )

        print(
            f"\nDetected company: "
            f"{company}"
        )


    print(
        f"User ID: {user_id}"
    )


    print(
        f"Selected document: "
        f"{document_name}"
    )


    # ==================================
    # RETRIEVE
    # ==================================

    results = search(

        question,

        limit=5,

        company=company,

        user_id=user_id,

        document_name=document_name

    )


    # ==================================
    # NO RESULTS
    # ==================================

    if not results:

        return {

            "answer": (

                "I could not find relevant "
                "information in the selected "
                "document."
            ),

            "sources": []

        }


    # ==================================
    # BUILD CONTEXT
    # ==================================

    context_parts = []


    for result in results:

        payload = result.payload

        text = payload.get(
            "text",
            ""
        )

        page = payload.get(
            "page_number",
            "Unknown"
        )

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


    context = "\n\n".join(
        context_parts
    )


    # ==================================
    # GEMINI PROMPT
    # ==================================

    prompt = f"""

{SYSTEM_PROMPT}

IMPORTANT:

Answer ONLY using the context below.

The user selected this document:

{document_name}

Context:

{context}

User Question:

{question}

Answer:

"""


    # ==================================
    # GEMINI
    # ==================================

    response = None


    for attempt in range(3):

        try:

            response = (
                client.models.generate_content(

                    model="gemini-3.5-flash",

                    contents=prompt

                )
            )

            break


        except Exception as error:

            error_text = str(
                error
            )


            print(

                f"Gemini API error "
                f"(attempt "
                f"{attempt + 1}/3): "
                f"{error_text}"

            )


            # ==================================
            # QUOTA
            # ==================================

            if (

                "429" in error_text

                or

                "RESOURCE_EXHAUSTED"
                in error_text

                or

                "quota"
                in error_text.lower()

            ):

                print(
                    "Gemini quota exhausted. "
                    "Using retrieval fallback."
                )

                return {

                    "answer":
                        build_retrieval_fallback(
                            results
                        ),

                    "sources":
                        build_sources(
                            results
                        )

                }


            # ==================================
            # TEMPORARY ERROR
            # ==================================

            if attempt < 2:

                time.sleep(2)

            else:

                print(
                    "Gemini unavailable. "
                    "Using retrieval fallback."
                )

                return {

                    "answer":
                        build_retrieval_fallback(
                            results
                        ),

                    "sources":
                        build_sources(
                            results
                        )

                }


    # ==================================
    # SAFETY
    # ==================================

    if response is None:

        return {

            "answer":
                build_retrieval_fallback(
                    results
                ),

            "sources":
                build_sources(
                    results
                )

        }


    # ==================================
    # GEMINI ANSWER
    # ==================================

    return {

        "answer":
            response.text,

        "sources":
            build_sources(
                results
            )

    }


# ==================================
# DIRECT TEST
# ==================================

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


        print(
            "\n========== ANSWER =========="
        )

        print(
            result["answer"]
        )


        print(
            "\n========== SOURCES =========="
        )


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