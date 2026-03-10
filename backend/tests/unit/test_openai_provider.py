import pytest
from unittest.mock import patch, MagicMock
from app.services.llm.openai_provider import OpenAIProvider
from app.services.llm.base import LLMProvider


def test_openai_provider_is_llm_provider():
    with patch("app.services.llm.openai_provider.OpenAI"):
        provider = OpenAIProvider(api_key="sk-test")
    assert isinstance(provider, LLMProvider)
    assert provider.provider_name == "openai"


@patch("app.services.llm.openai_provider.OpenAI")
def test_generate_text(MockOpenAI):
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Generated text"
    mock_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])
    MockOpenAI.return_value = mock_client

    provider = OpenAIProvider(api_key="sk-test")
    result = provider.generate_text("Say hello", model="gpt-4o")
    assert result == "Generated text"
    mock_client.chat.completions.create.assert_called_once_with(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Say hello"}],
        temperature=0.3,
    )


@patch("app.services.llm.openai_provider.OpenAI")
def test_generate_text_uses_default_model(MockOpenAI):
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Hi"
    mock_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])
    MockOpenAI.return_value = mock_client

    provider = OpenAIProvider(api_key="sk-test", default_model="gpt-4o-mini")
    provider.generate_text("prompt")
    call_kwargs = mock_client.chat.completions.create.call_args[1]
    assert call_kwargs["model"] == "gpt-4o-mini"


@patch("app.services.llm.openai_provider.OpenAI")
def test_list_models(MockOpenAI):
    mock_client = MagicMock()
    mock_model_1 = MagicMock(); mock_model_1.id = "gpt-4o"
    mock_model_2 = MagicMock(); mock_model_2.id = "gpt-4o-mini"
    mock_model_3 = MagicMock(); mock_model_3.id = "dall-e-3"
    mock_client.models.list.return_value = MagicMock(data=[mock_model_1, mock_model_2, mock_model_3])
    MockOpenAI.return_value = mock_client

    provider = OpenAIProvider(api_key="sk-test")
    models = provider.list_models()
    assert "gpt-4o" in models
    assert "gpt-4o-mini" in models
    assert "dall-e-3" not in models


@patch("app.services.llm.openai_provider.OpenAI")
def test_validate_connection_success(MockOpenAI):
    mock_client = MagicMock()
    mock_client.models.list.return_value = MagicMock(data=[])
    MockOpenAI.return_value = mock_client
    provider = OpenAIProvider(api_key="sk-test")
    assert provider.validate_connection() is True


@patch("app.services.llm.openai_provider.OpenAI")
def test_validate_connection_failure(MockOpenAI):
    mock_client = MagicMock()
    mock_client.models.list.side_effect = Exception("invalid key")
    MockOpenAI.return_value = mock_client
    provider = OpenAIProvider(api_key="sk-test")
    assert provider.validate_connection() is False


def test_no_api_key_raises():
    with pytest.raises(ValueError, match="API key"):
        OpenAIProvider(api_key="")


@patch("app.services.llm.openai_provider.time")
@patch("app.services.llm.openai_provider.OpenAI")
def test_generate_text_retries_on_rate_limit(MockOpenAI, mock_time):
    from openai import RateLimitError
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Success after retry"
    mock_response = MagicMock()
    mock_response.status_code = 429
    mock_response.headers = {}
    rate_limit_err = RateLimitError(
        message="Rate limited", response=mock_response, body=None
    )
    mock_client.chat.completions.create.side_effect = [
        rate_limit_err, rate_limit_err, MagicMock(choices=[mock_choice]),
    ]
    MockOpenAI.return_value = mock_client
    mock_time.sleep = MagicMock()

    provider = OpenAIProvider(api_key="sk-test")
    result = provider.generate_text("prompt", model="gpt-4o")
    assert result == "Success after retry"
    assert mock_client.chat.completions.create.call_count == 3
    assert mock_time.sleep.call_count == 2


@patch("app.services.llm.openai_provider.time")
@patch("app.services.llm.openai_provider.OpenAI")
def test_generate_text_raises_after_max_retries(MockOpenAI, mock_time):
    from openai import RateLimitError
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.status_code = 429
    mock_response.headers = {}
    rate_limit_err = RateLimitError(
        message="Rate limited", response=mock_response, body=None
    )
    mock_client.chat.completions.create.side_effect = rate_limit_err
    MockOpenAI.return_value = mock_client
    mock_time.sleep = MagicMock()

    provider = OpenAIProvider(api_key="sk-test")
    with pytest.raises(RateLimitError):
        provider.generate_text("prompt", model="gpt-4o")
    assert mock_client.chat.completions.create.call_count == 3
