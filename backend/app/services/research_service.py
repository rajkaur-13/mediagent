import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict
import time

class ResearchService:
    def __init__(self):
        self.base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
    
    def search_pubmed(self, query: str, years_back: int = 2, max_results: int = 5) -> List[Dict]:
        """Search PubMed for recent research papers"""
        
        # Calculate date range
        current_year = datetime.now().year
        date_range = f"{current_year - years_back}:{current_year}[dp]"
        
        # Search for papers
        search_url = f"{self.base_url}esearch.fcgi"
        search_params = {
            "db": "pubmed",
            "term": f"{query} AND {date_range}",
            "retmax": max_results,
            "retmode": "json",
            "sort": "pub date"
        }
        
        try:
            response = requests.get(search_url, params=search_params, timeout=10)
            data = response.json()
            paper_ids = data.get("esearchresult", {}).get("idlist", [])
            
            if not paper_ids:
                return []
            
            # Fetch details for each paper
            papers = []
            for pid in paper_ids[:3]:
                paper_info = self._fetch_paper_details(pid)
                if paper_info:
                    papers.append(paper_info)
                time.sleep(0.5)  # Be nice to PubMed API
            
            return papers
            
        except Exception as e:
            print(f"PubMed search error: {e}")
            return []
    
    def _fetch_paper_details(self, paper_id: str) -> Dict:
        """Fetch detailed information for a specific paper"""
        
        fetch_url = f"{self.base_url}efetch.fcgi"
        params = {
            "db": "pubmed",
            "id": paper_id,
            "retmode": "xml"
        }
        
        try:
            response = requests.get(fetch_url, params=params, timeout=10)
            root = ET.fromstring(response.content)
            
            # Extract article details
            article = root.find(".//Article")
            if article is None:
                return None
            
            # Title
            title_elem = article.find(".//ArticleTitle")
            title = title_elem.text if title_elem is not None else "No title"
            
            # Abstract
            abstract_elem = article.find(".//Abstract/AbstractText")
            abstract = abstract_elem.text if abstract_elem is not None else "No abstract available"
            abstract = abstract[:300] + "..." if len(abstract) > 300 else abstract
            
            # Journal
            journal_elem = article.find(".//Journal/Title")
            journal = journal_elem.text if journal_elem is not None else "Unknown journal"
            
            # Date
            pub_date_elem = article.find(".//PubDate")
            if pub_date_elem is not None:
                year = pub_date_elem.findtext("Year", "Unknown")
                month = pub_date_elem.findtext("Month", "")
                day = pub_date_elem.findtext("Day", "")
                pub_date = f"{year} {month} {day}".strip()
            else:
                pub_date = "Unknown date"
            
            # Authors
            authors = []
            for author in article.findall(".//Author"):
                last_name = author.findtext("LastName", "")
                fore_name = author.findtext("ForeName", "")
                if last_name:
                    authors.append(f"{last_name} {fore_name}".strip())
            
            author_text = ", ".join(authors[:3])
            if len(authors) > 3:
                author_text += " et al."
            
            # DOI
            doi_elem = article.find(".//ELocationID[@EIdType='doi']")
            doi = doi_elem.text if doi_elem is not None else ""
            
            return {
                "id": paper_id,
                "title": title,
                "abstract": abstract,
                "journal": journal,
                "date": pub_date,
                "authors": author_text,
                "doi": doi,
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{paper_id}/"
            }
            
        except Exception as e:
            print(f"Error fetching paper {paper_id}: {e}")
            return None
    
    def search_by_diagnosis(self, diagnosis: str) -> List[Dict]:
        """Search research papers related to a diagnosis"""
        
        # Clean and format diagnosis
        search_terms = diagnosis.lower().replace("suspected", "").replace("possible", "").strip()
        
        # Add treatment keywords
        queries = [
            f"{search_terms} treatment",
            f"{search_terms} guidelines",
            f"{search_terms} management"
        ]
        
        all_papers = []
        for query in queries[:2]:  # Limit to 2 searches
            papers = self.search_pubmed(query, years_back=2, max_results=3)
            for paper in papers:
                if paper not in all_papers:
                    all_papers.append(paper)
        
        return all_papers[:5]  # Return top 5 unique papers

research_service = ResearchService()
