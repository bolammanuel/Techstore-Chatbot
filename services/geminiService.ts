import { Type } from "@google/genai";
import { Product } from "../types";
import { MOCK_PRODUCTS } from "../constants";

const getApiKey = () => 
  import.meta.env.VITE_GEMINI_API_KEY || 
  import.meta.env.VITE_API_KEY || 
  (typeof process !== "undefined" ? process.env.API_KEY : "");

const createGenAIClient = async () => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.includes("your_")) return null;
  const module = await import("@google/genai");
  return new module.GoogleGenAI({ apiKey });
};

const GEMINI_MODEL = "gemini-2.5-flash";

export const getSmartSearch = async (query: string): Promise<string[]> => {
  if (!getApiKey() || query.length < 2) {
    if (!getApiKey()) console.warn("Gemini Search: VITE_GEMINI_API_KEY is missing.");
    return MOCK_PRODUCTS.map((p) => p.id);
  }

  try {
    const ai = await createGenAIClient();
    if (!ai) return MOCK_PRODUCTS.map((p) => p.id);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Given this product list: ${JSON.stringify(MOCK_PRODUCTS.map((p) => ({ id: p.id, name: p.name, desc: p.description })))}. 
      The user search query is: "${query}". 
      Return only a JSON array of product IDs that best match this query.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return MOCK_PRODUCTS.map((p) => p.id);
  }
};

export const getSearchSuggestions = async (
  query: string,
): Promise<string[]> => {
  if (!getApiKey() || query.length < 2) return [];

  try {
    const ai = await createGenAIClient();
    if (!ai) return [];

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Based on these products: ${MOCK_PRODUCTS.map((p) => p.name).join(", ")}. 
      The user is typing: "${query}". 
      Return a JSON array of 3-5 concise, relevant search suggestions (strings).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    return [];
  }
};

export interface ChatAction {
  type: "ADD_TO_CART";
  productId: string;
}

export interface ChatResponse {
  text: string;
  action?: ChatAction;
}

export const getChatResponse = async (
  message: string,
  history: { role: "user" | "model"; text: string }[],
): Promise<ChatResponse> => {
  if (!getApiKey() || getApiKey().includes("your_")) {
    console.warn("Gemini Chat: VITE_GEMINI_API_KEY is missing or invalid in environment settings.");
    return {
      text: "I'm sorry, I'm having trouble connecting right now. Please verify that VITE_GEMINI_API_KEY is configured in your hosting environment variables.",
    };
  }

  const siteInfo = {
    name: "TechStore",
    categories: ["Laptops", "Audio", "Wearables", "Smart Home"],
    products: MOCK_PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      description: p.description,
      stock: p.stock,
    })),
    shipping:
      "Free Express Delivery on orders over $500. Standard shipping takes 3-5 business days.",
    returns: "30-day return policy for unused items in original packaging.",
    support:
      "24/7 support via live chat, email (support@techstore.com), or phone (+1 800 TECH-STORE).",
    vat: "7.5% VAT is applied to all orders.",
  };

  try {
    const ai = await createGenAIClient();
    if (!ai) {
      return {
        text: "I'm sorry, I'm having trouble connecting right now. Please verify that VITE_GEMINI_API_KEY is configured in your hosting environment variables.",
      };
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: message,
      config: {
        systemInstruction: `You are a helpful and professional AI assistant for TechStore, a premium electronics e-commerce site. 
        Your goal is to assist customers with product discovery, order tracking, and general inquiries.
        
        Here is the site information you should use:
        ${JSON.stringify(siteInfo)}
        
        Guidelines:
        - Be concise, friendly, and professional.
        - If a user asks about a specific product, provide details from the product list.
        - If a user asks about shipping or returns, use the provided support information.
        - If you don't know the answer, suggest they contact our human support team at support@techstore.com.
        - Encourage users to check out our "Discovery" section for new releases.
        - Mention that we have a "Track Order" feature if they have an Order ID.
        - You can add products to the user's cart if they ask. Use the addToCart tool.`,
        tools: [
          {
            functionDeclarations: [
              {
                name: "addToCart",
                description: "Add a product to the shopping cart",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    productId: {
                      type: Type.STRING,
                      description: "The ID of the product to add to cart",
                    },
                  },
                  required: ["productId"],
                },
              },
            ],
          },
        ],
      },
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === "addToCart") {
        const productId = (call.args as any)?.productId;
        const product = MOCK_PRODUCTS.find((p) => p.id === productId);
        if (product) {
          return {
            text: `I've added the **${product.name}** to your cart!`,
            action: { type: "ADD_TO_CART", productId: product.id },
          };
        }
      }
    }

  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    const errMessage = error?.message || error?.toString() || "Unknown error";
    return { 
      text: `I'm sorry, I encountered an error connecting to Google Gemini API: ${errMessage}. Please verify that your API key is valid and has Gemini API permissions in Google AI Studio.` 
    };
  }
};
