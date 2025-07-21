import os
from typing import Optional, Dict, Any
from openai import AzureOpenAI
import json


class LLMClient:
    """Azure OpenAI客户端类"""
    
    def __init__(self, use_azure: bool = True, deployment: str = "gpt-4"):
        # 设置Azure OpenAI配置
        os.environ["AZURE_OPENAI_API_KEY"] = "69b15af66d9547228771cbd20d2ffff2"
        os.environ["AZURE_OPENAI_API_BASE"] = "https://aep-gpt4-dev-va7.openai.azure.com/"
        os.environ["AZURE_OPENAI_API_VERSION"] = "2024-02-15-preview"
        
        self.use_azure = use_azure
        self.deployment = deployment
        
        if use_azure:
            try:
                self.client = AzureOpenAI(
                    api_key=os.getenv("AZURE_OPENAI_API_KEY", ""),
                    api_version=os.getenv("AZURE_OPENAI_API_VERSION", ""),
                    azure_endpoint=os.getenv("AZURE_OPENAI_API_BASE", "")
                )
                print("Azure OpenAI客户端初始化成功")
            except Exception as e:
                print(f"Azure OpenAI客户端初始化失败: {e}")
                raise
        else:
            raise NotImplementedError("目前只支持Azure OpenAI")
    
    def generate_response(self, 
                         messages: list, 
                         temperature: float = 0.7,
                         max_tokens: int = 1500,
                         response_format: Optional[Dict[str, Any]] = None) -> str:
        """生成LLM响应"""
        try:
            kwargs = {
                "model": self.deployment,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            # 如果指定了JSON格式
            if response_format:
                kwargs["response_format"] = response_format
            
            response = self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            print(f"LLM调用失败: {e}")
            return ""
    
    def generate_json_response(self, messages: list, temperature: float = 0.7) -> Dict[str, Any]:
        """生成JSON格式的响应"""
        response = self.generate_response(
            messages=messages,
            temperature=temperature,
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(response)
        except json.JSONDecodeError as e:
            print(f"JSON解析失败: {e}")
            print(f"原始响应: {response}")
            return {} 