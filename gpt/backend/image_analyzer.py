import ollama
import sys
import json
import os

def analyze_image(image_path, question="Describe this image in detail."):
    if not os.path.exists(image_path):
        return {"error": f"File not found: {image_path}"}
    
    try:
        response = ollama.chat(
            model="llava",
            messages=[
                {
                    "role": "user",
                    "content": question,
                    "images": [image_path]
                }
            ]
        )
        return {"reply": response["message"]["content"]}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided."}))
        sys.exit(1)
    
    img_path = sys.argv[1]
    query = sys.argv[2] if len(sys.argv) > 2 else "Describe this image in detail."
    
    result = analyze_image(img_path, query)
    print(json.dumps(result))
