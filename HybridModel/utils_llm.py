import os
import json
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional
import pandas as pd

@dataclass
class LLMExplanationResult:
    course_id: str
    title: str
    prompt_used: str
    llm_response: str
    provider: str

    def to_dict(self):
        return asdict(self)

def build_llm_prompt(explanation: dict, courses_df: pd.DataFrame) -> str:
    """Takes a dict representation of ExplanationResult and generates a prompt."""
    title = explanation.get('title', 'Unknown Course')
    cf_score = explanation.get('cf_score', 0)
    content_score = explanation.get('content_score', 0)
    alpha = explanation.get('alpha', 0.5)
    matched = explanation.get('top_genres_matched', [])
    similar = explanation.get('similar_courses', [])
    shap_vals = explanation.get('shap_values', {})
    
    # Get top 3 positive SHAP features
    top_features = sorted(shap_vals.items(), key=lambda x: x[1], reverse=True)[:3]
    top_feature_names = [f[0] for f in top_features if f[1] > 0]
    
    prompt = f"Explain to a student why they were recommended the course '{title}'.\n\n"
    prompt += "Context from our Recommendation System:\n"
    prompt += f"- The recommendation blends Collaborative Filtering (weight: {alpha}) and Content-Based Filtering (weight: {1-alpha}).\n"
    prompt += f"- The course scored {cf_score:.2f}/1.0 on Collaborative Filtering (users similar to them liked it).\n"
    prompt += f"- The course scored {content_score:.2f}/1.0 on Content-Based Filtering (matches their past course history).\n"
    
    if matched:
        prompt += f"- Keywords/Genres related to this course that match their interests: {', '.join(matched)}.\n"
    
    if similar:
        prompt += f"- This course is content-wise similar to courses they previously engaged with, such as: {', '.join(similar)}.\n"
        
    if top_feature_names:
        prompt += f"- Our AI explainer model (SHAP) identified that the topics {', '.join(top_feature_names)} were the strongest drivers for this exact recommendation score.\n"
        
    prompt += "\nTask:\nWrite a friendly, brief (2-3 sentences max) natural-language explanation addressing the student directly (e.g., 'We recommended this course because...'). Focus on the strongest signals."
    return prompt

def call_openai(prompt: str, api_key: str, model: str = "gpt-3.5-turbo") -> str:
    import openai
    
    try:
        # Support for newer openai versions >= 1.0.0
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=150
        )
        return response.choices[0].message.content.strip()
    except ImportError:
        # Fallback for older openai versions < 1.0.0
        openai.api_key = api_key
        response = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=150
        )
        return response.choices[0].message.content.strip()

def call_claude(prompt: str, api_key: str, model: str = "claude-3-haiku-20240307") -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model,
        max_tokens=150,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()

def get_llm_explanation(explanation: Any, courses_df: pd.DataFrame, provider: str, api_key: Optional[str] = None, model: Optional[str] = None) -> LLMExplanationResult:
    """Takes an ExplanationResult, builds a prompt, and calls the specified LLM API."""
    if hasattr(explanation, 'to_dict'):
        exp_dict = explanation.to_dict()
    else:
        exp_dict = explanation
        
    prompt = build_llm_prompt(exp_dict, courses_df)
    
    api_key = api_key or os.environ.get(f"{provider.upper()}_API_KEY")
    if not api_key:
        return LLMExplanationResult(
            course_id=exp_dict['course_id'],
            title=exp_dict['title'],
            prompt_used=prompt,
            llm_response=f"Error: No API key provided for {provider}.",
            provider=provider
        )
        
    try:
        if provider.lower() == 'openai':
            resp = call_openai(prompt, api_key, model or "gpt-3.5-turbo")
        elif provider.lower() == 'claude':
            resp = call_claude(prompt, api_key, model or "claude-3-haiku-20240307")
        else:
            resp = f"Error: Unsupported provider '{provider}'"
    except Exception as e:
        resp = f"Error calling {provider} API: {str(e)}"
        
    return LLMExplanationResult(
        course_id=exp_dict['course_id'],
        title=exp_dict['title'],
        prompt_used=prompt,
        llm_response=resp,
        provider=provider
    )
