import json
import pandas as pd
from ragas import evaluate
from ragas.metrics import (
    # Retriever Metrics
    ContextPrecision,
    ContextRecall,
    ContextEntityRecall,
    
    # Generation Metrics
    Faithfulness,
    AnswerRelevancy,
    AnswerCorrectness,
    AnswerSimilarity,
    
    # Additional
    SemanticSimilarity,
)
from datasets import Dataset
from config import Config
import os
from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings

class RAGEvaluator:
    def __init__(self):
        self.metrics = None
    
    def load_dataset(self, file_path):
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        for item in data:
            if 'contexts' not in item or item['contexts'] is None:
                item['contexts'] = []
            if not isinstance(item['contexts'], list):
                item['contexts'] = []
            item['contexts'] = [str(c) for c in item['contexts']]
            if 'answer' not in item or item['answer'] is None:
                item['answer'] = ""
            if 'question' not in item or item['question'] is None:
                item['question'] = ""
            if 'ground_truth' not in item or item['ground_truth'] is None:
                item['ground_truth'] = ""
        
        return Dataset.from_list(data)
    
    def run_evaluation(self, dataset):
        # Use Groq for LLM
        llm = ChatGroq(
            groq_api_key=Config.GROK_API_KEY,
            model_name="llama-3.3-70b-versatile",
            temperature=0
        )
        
        # Use HuggingFace for embeddings
        embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2"
        )
        
        # Initialize ALL metrics with correct parameters
        metrics = [
            # Retriever Metrics (don't need embeddings)
            ContextPrecision(llm=llm),
            ContextRecall(llm=llm),
            ContextEntityRecall(llm=llm),
            
            # Generation Metrics
            Faithfulness(llm=llm),
            AnswerRelevancy(llm=llm, embeddings=embeddings),
            AnswerCorrectness(llm=llm, embeddings=embeddings),
            AnswerSimilarity(embeddings=embeddings),
            
            # Additional
            SemanticSimilarity(embeddings=embeddings),
        ]
        
        return evaluate(
            dataset,
            metrics=metrics,
            llm=llm,
            embeddings=embeddings
        )
    
    def save_results(self, result):
        results_df = result.to_pandas()
        os.makedirs(Config.RESULTS_PATH, exist_ok=True)
        results_df.to_csv(f"{Config.RESULTS_PATH}/evaluation_results.csv")
        results_df.to_json(f"{Config.RESULTS_PATH}/evaluation_results.json", orient="records")
        
        print("\n" + "=" * 60)
        print("📊 COMPLETE RAGAS EVALUATION RESULTS")
        print("=" * 60)
        
        # Print all scores
        for col in results_df.columns:
            if 'score' in col.lower() or any(m in col.lower() for m in ['precision', 'recall', 'faithfulness', 'relevancy', 'correctness', 'similarity']):
                score = results_df[col].mean()
                if not pd.isna(score):
                    print(f"  ✅ {col}: {score:.4f} ({score*100:.1f}%)")
        
        print("\n" + "=" * 60)
        print("📈 EVALUATION SUMMARY")
        print("=" * 60)
        
        # Calculate RAGAS composite score
        core_metrics = ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]
        scores = []
        for col in results_df.columns:
            for metric in core_metrics:
                if metric in col.lower():
                    val = results_df[col].mean()
                    if not pd.isna(val):
                        scores.append(val)
        
        if len(scores) >= 3:  # If we have at least 3 metrics
            import numpy as np
            from scipy.stats import hmean
            try:
                ragas_score = hmean(scores)
                print(f"\n🏆 RAGAS Composite Score: {ragas_score:.4f} ({ragas_score*100:.1f}%)")
                print("   (Harmonic mean of available core metrics)")
            except:
                avg_score = np.mean(scores)
                print(f"\n📊 Average Score: {avg_score:.4f} ({avg_score*100:.1f}%)")
        
        print("\n" + "=" * 60)

def main():
    print("🚀 Starting Complete RAGAS Evaluation for MediAgent V2")
    print("-" * 50)
    
    evaluator = RAGEvaluator()
    
    print("📂 Loading test dataset...")
    dataset = evaluator.load_dataset("data/test_dataset.json")
    print(f"✅ Loaded {len(dataset)} test cases")
    
    print("🧪 Running RAGAS evaluation with ALL metrics...")
    print("   This may take a few minutes...")
    result = evaluator.run_evaluation(dataset)
    
    evaluator.save_results(result)
    
    print("\n✅ Evaluation complete! Results saved to evaluation/results/")

if __name__ == "__main__":
    main()