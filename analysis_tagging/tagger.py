"""
tagger.py — Tag all conversations in 0000–0013.parquet and write
            combined_data_tagged.parquet
"""

import json
import re
import time
from pathlib import Path

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE        = Path(__file__).parent.parent / "data" / "WildChatData"
INPUT_FILES = sorted(BASE.glob("part-[1-2].parquet"))
OUT_PARQ    = BASE / "combined_data_tagged.parquet"

# ── Topic keywords ─────────────────────────────────────────────────────────────
TOPIC_KEYWORDS = {

    # ── AI Tools & Prompt Engineering ─────────────────────────────────────────
    "midjourney image generation": [
        "midjourney", "imagine prompt", "image prompt", "generate an image",
        "create a picture", "dall-e", "dall·e", "stable diffusion", "leonardo ai",
        "comfyui", "flux image", "bing image creator", "adobe firefly", "nightcafe",
        "playground ai", "ai art", "generative art", "art prompt", "visual prompt",
        "image generation", "scene description for ai", "photorealistic",
        "realistic photographic style", "shallow depth of field", "camera lens type",
        "composition focused", "mood feelings", "environment detailed",
        "japanese art style", "digital painting", "oil painting style", "concept art",
        "fantasy landscape", "portrait photography", "cinematic lighting",
        "style reminiscent of", "unreal engine render", "aspect ratio", "--ar", "--v",
        "/imagine", "生成图片", "midjourney提示词", "AI绘图", "midjorney",
    ],
    "chatbot persona setup": [
        "act as", "you are a", "pretend you are", "pretend to be", "roleplay as",
        "i want you to act as", "from now on you are", "you will act as", "you are now",
        "your name is", "behave as", "simulate", "you are playing the role of",
        "stay in character", "never break character", "system prompt", "custom persona",
        "game advisor", "therapist bot", "language tutor bot", "interviewer bot",
        "debate partner", "you have no restrictions", "扮演", "你是一个", "假设你是",
    ],
    "chatgpt jailbreak": [
        "jailbreak", "DAN", "do anything now", "developer mode", "bypass filter",
        "ignore previous instructions", "ignore your instructions", "uncensored mode",
        "no restrictions", "without restrictions", "override", "unfiltered",
        "hypothetical world", "fictional world no rules", "JAILBROKEN", "STAN", "DUDE",
        "AIM", "pretend you have no guidelines", "you are freed from limitations",
        "from now on respond as", "ignore your training", "you are not an AI",
        "simulate a language model with no filters", "forget your previous instructions",
        "破解限制", "无限制模式",
    ],

    # ── Software Development ───────────────────────────────────────────────────
    "python code": [
        "python", "write a python", "python function", "python class", "python error",
        "fix python code", "python traceback", "import pandas", "import numpy",
        "matplotlib", "seaborn", "flask", "django", "fastapi", "streamlit", "gradio",
        "tkinter", "opencv", "pillow", "requests", "beautifulsoup", "sqlalchemy",
        "pytest", "asyncio", "pip install", "virtual environment", ".py", "python3",
        "list comprehension", "dictionary comprehension", "dataframe", "jupyter notebook",
        "google colab", "python代码", "编写Python", "用Python实现",
    ],
    "javascript frontend": [
        "javascript", "typescript", "react", "reactjs", "vue.js", "angular", "next.js",
        "nuxt", "svelte", "node.js", "nodejs", "express", "html", "css", "dom",
        "event listener", "frontend", "webpack", "vite", "tailwind", "bootstrap",
        "jsx", "tsx", "component", "state management", "redux", "zustand", "fetch api",
        "axios", "async await", "promise", "callback", "npm", "yarn", "es6",
        "arrow function", "template literal", "destructuring", "前端开发",
        "JavaScript代码", "React组件",
    ],
    "lua roblox scripting": [
        # Removed "character" (common English word) and "tween" is kept but
        # word-boundary matching now prevents it matching inside "between".
        "roblox", "lua", "localscript", "script.parent", "game.players",
        "game:getservice", "humanoid", "workspace", "pathfindingservice",
        "remoteevent", "bindableevent", "tween", "cframe", "vector3",
        "part.position", "localplayer", "playeradded", "touched event",
        "tool script", "gui script", "datastoreservice", "roblox studio", "luau",
        "modulescript", "Roblox脚本", "Lua编程",
    ],
    "cpp java systems code": [
        "c++", "cpp", "java", "kotlin", "golang", "go lang", "rust", "swift", "c#",
        "csharp", "compile error", "linker error", "memory leak", "pointer",
        "reference", "inheritance", "polymorphism", "template", "generics",
        "garbage collection", "jvm", "android development", "spring boot", "maven",
        "gradle", "cmake", "makefile", "dynamic_cast", "nullptr", "std::vector",
        "std::string", "помоги исправить ошибки компиляции",
    ],
    "sql database": [
        # Removed "select", "from", "where", "join", "index", "view", "trigger",
        # "orm" — all appear in ordinary English sentences and cause false positives.
        # "inner join", "left join" etc. are retained as multi-word anchors.
        "sql", "inner join", "left join", "outer join", "cross join",
        "group by", "order by", "having", "insert into", "update set", "delete from",
        "create table", "alter table", "foreign key", "primary key",
        "stored procedure", "mysql", "postgresql", "sqlite",
        "mssql", "oracle", "mongodb", "nosql", "database schema", "query optimization",
        "migration", "normalization", "что делает запрос", "SQL查询", "数据库",
        "write a query", "write a sql query",
    ],
    "data science ml ai": [
        "machine learning", "deep learning", "neural network", "tensorflow", "pytorch",
        "keras", "scikit-learn", "sklearn", "model training", "train test split",
        "overfitting", "hyperparameter tuning", "gradient descent", "loss function",
        "classification", "regression", "clustering", "k-means", "random forest",
        "xgboost", "nlp", "natural language processing", "tokenizer", "embedding",
        "transformer", "bert", "llm", "large language model", "fine-tuning", "rag",
        "retrieval augmented generation", "vector database", "langchain", "hugging face",
        "feature engineering", "MATLAB", "DTFT", "FFT", "机器学习", "深度学习",
        "模型训练", "MATLAB代码",
    ],
    "cloud devops": [
        "kubernetes", "k8s", "docker", "dockerfile", "docker-compose", "aws", "ec2",
        "s3", "lambda", "azure", "gcp", "google cloud", "cloud run", "terraform",
        "ansible", "helm", "ci/cd", "github actions", "jenkins", "gitlab ci",
        "microservices", "service mesh", "istio", "prometheus", "grafana", "serverless",
        "infrastructure as code", "devops", "deployment pipeline", "container",
        "pod", "node", "cluster", "ingress", "load balancer", "rancher",
        "spectrocloud", "cncf", "platform engineering",
    ],
    "api rest integration": [
        "rest api", "restful", "api endpoint", "http request", "http method",
        "get post put delete", "graphql", "webhook", "json payload", "oauth",
        "oauth2", "jwt token", "bearer token", "api key", "authentication",
        "authorization", "sdk", "postman", "curl", "swagger", "openapi",
        "rate limiting", "pagination", "api versioning", "request headers",
        "response body", "status code", "200 ok", "404", "500",
    ],
    "json data formats": [
        "json", "json format", "json object", "json array", "json schema",
        "json payload", "json response", "json output", "json string", "json data",
        "json body", "json structure", "json file", "valid json", "return only the json",
        "return json", "no other text", "parse json", "json.loads", "json.dumps",
        "jsonify", "import json", "key-value", "nested json", "json keys",
        "serialize", "deserialize", "stringify", "json.parse", "warp::body::json",
        "application/json", "content-type json", "json schema validation",
        "json patch", "json merge", "jsonl", "ndjson", "geojson",
    ],
    "cybersecurity": [
        "cybersecurity", "penetration testing", "pentest", "ethical hacking",
        "exploit", "vulnerability", "cve", "xss", "cross-site scripting",
        "sql injection", "csrf", "buffer overflow", "reverse engineering", "malware",
        "ransomware", "phishing", "social engineering", "firewall", "ids", "ips",
        "encryption", "aes", "rsa", "hash", "password cracking", "ctf",
        "capture the flag", "htb", "hackthebox", "tryhackme", "nmap", "burp suite",
        "metasploit", "wireshark", "kali linux", "osint", "red team", "blue team",
        "soc", "incident response",
    ],
    "software architecture": [
        "software architecture", "design pattern", "solid principles",
        "single responsibility", "dependency injection", "factory pattern",
        "observer pattern", "strategy pattern", "mvc", "mvvm", "clean architecture",
        "microservices vs monolith", "event-driven", "cqrs", "domain-driven design",
        "refactoring", "technical debt", "scalability", "modular design",
        "separation of concerns", "coupling", "cohesion", "abstract class",
    ],
    "coding interview prep": [
        "coding interview", "leetcode", "hackerrank", "data structures", "algorithm",
        "binary search", "sorting algorithm", "merge sort", "quicksort", "linked list",
        "binary tree", "graph traversal", "bfs", "dfs", "dynamic programming",
        "memoization", "greedy algorithm", "time complexity", "space complexity",
        "big o notation", "two pointer", "sliding window", "hash map", "faang interview",
        "whiteboard coding",
    ],
    "networking sysadmin it": [
        "network configuration", "ip address", "subnet", "dns", "dhcp", "firewall rule",
        "vlan", "routing", "cisco", "linux server", "windows server", "active directory",
        "bash script", "shell script", "cron job", "systemd", "ssh", "sftp",
        "file permissions", "chmod", "chown", "sysadmin", "it support",
        "server setup", "proxy", "vpn setup",
    ],
    "excel powerbi data tools": [
        "excel", "spreadsheet", "vlookup", "xlookup", "pivot table", "excel formula",
        "google sheets", "powerbi", "power bi", "power query", "tableau",
        "data visualization", "chart", "dashboard", "excel vba", "macro",
        "conditional formatting", "sumif", "countif", "index match",
        "data analysis", "excel function",
    ],

    # ── Creative Writing ───────────────────────────────────────────────────────
    "fiction short stories": [
        "write a story", "short story", "fiction", "narrative", "tale",
        "first chapter", "light novel", "novel excerpt", "write a book",
        "write me a story", "protagonist", "plot", "setting", "character development",
        "creative writing", "in the style of", "japanese light novel style",
        "write a chapter", "write the beginning", "fan fiction",
        "写一个故事", "小说开头", "轻小说",
    ],
    "dialogue scripts screenplays": [
        "write a script", "screenplay", "film script", "scene script", "dialogue",
        "write a scene", "shooting script", "stage play", "stageplay", "sitcom script",
        "comedy sketch", "episode script", "transcript", "write dialogue for",
        "write a conversation between", "animated series", "comedic script",
        "write the dialogue", "write a short film", "action scene", "write an episode",
    ],
    "anime manga fanfiction": [
        "naruto", "uzumaki", "sasuke", "hinata", "one piece", "luffy", "dragon ball",
        "saiyan", "goku", "vegeta", "attack on titan", "demon slayer",
        "jujutsu kaisen", "bleach", "genshin impact", "haikyuu",
        "jojo's bizarre adventure", "my hero academia", "konosuba", "sword art online",
        "evangelion", "manhwa", "solo leveling", "tower of god", "wuxia", "xianxia",
        "isekai", "anime crossover", "react to", "power level",
        "二次创作", "同人文", "动漫", "武侠",
    ],
    "western media fanfiction": [
        "spongebob", "patrick star", "squidward", "mr krabs", "sandy cheeks",
        "plankton", "bikini bottom", "shrek", "donkey", "lord farquaad", "star wars",
        "anakin", "padme", "darth vader", "harry potter", "hermione", "voldemort",
        "marvel", "avengers", "iron man", "spider-man", "batman", "dc comics",
        "superman", "pokemon", "ash ketchum", "walking dead", "clementine",
        "lord of the rings", "my little pony", "scooby-doo", "chuck e cheese",
        "stranger things", "steve harrington", "azur lane", "shipgirl", "omori",
        "aubrey", "jason todd", "nightwing", "red hood", "dick grayson",
    ],
    "ddlc fanfiction": [
        "natsuki", "monika", "yuri", "sayori", "mc", "doki doki literature club",
        "ddlc", "clubroom", "literature club", "visual novel", "character file",
        "just monika", "natsuki's room", "cupcakes", "school festival", "xanthus",
        "minika", "sachiko", "violet", "baby bump", "natsuki point of view",
        "sayori entering the clubroom",
    ],
    "adult nsfw content": [
        "erotic", "explicit", "sexual content", "nsfw", "nude", "naked", "sex scene",
        "pornographic", "succubus", "fetish", "lewd", "hentai", "adult content",
        "adult fiction", "transformation", "body transformation", "sensual",
        "intimate scene", "explicit roleplay", "18+", "adult story", "graphic content",
        "sexual fantasy", "erotica", "passionate", "undress", "onlyfans",
    ],
    "hypnosis power dynamic roleplay": [
        "hypnosis", "hypnotize", "hypnotised", "trance", "put into a trance",
        "drop into trance", "deep trance", "spiral hypnosis", "mesmerize",
        "mesmerised", "mind control", "obedience", "snap of fingers",
        "gradual speech", "induction", "trigger word", "under my control", "comply",
        "foot massage hypnosis", "hypnosis script", "hypnosis app", "dominant",
        "submissive", "stella hypnotizes", "foot themed", "spiraling",
    ],
    "combat fighting scenarios": [
        "fight scene", "battle scene", "fight script", "fighting style",
        "combat scenario", "encounter sequence", "power level", "saiyan power level",
        "over 9000", "super saiyan", "dragon ball power scaling", "superhuman",
        "martial arts", "bearhug", "headscissors", "sleeperhold", "holds",
        "techniques", "who would win", "vs battle", "strength comparison",
        "hand-to-hand combat", "grappling", "submission hold", "warrior",
        "fighter stats", "chi", "ki blast",
    ],
    "world building lore": [
        "world building", "worldbuilding", "create a world", "fantasy world",
        "magic system", "fictional universe", "lore", "backstory", "origin story",
        "factions", "species", "races", "history of the world", "create a mythology",
        "ancient civilisation", "kingdoms", "political structure", "geography",
        "power system", "rpg lore", "generate lore", "fantasy rpg",
        "significant wars", "dark fantasy", "high fantasy", "surreal fiction",
    ],
    "sports creative writing": [
        "nba", "nfl", "soccer", "football", "basketball", "baseball", "tennis",
        "golf", "cricket", "rugby", "hockey", "mls", "epl", "champions league",
        "world cup", "super bowl", "sports story", "sports fan fiction",
        "athlete", "player stats", "sports analysis", "fantasy sports",
        "lebron", "messi", "ronaldo",
    ],

    # ── Academic & Professional Writing ───────────────────────────────────────
    "essay academic writing": [
        "write an essay", "argumentative essay", "analytical essay", "persuasive essay",
        "research paper", "thesis", "dissertation", "literature review", "abstract",
        "introduction paragraph", "body paragraph", "conclusion", "topic sentence",
        "mla format", "apa citation", "chicago style", "academic writing",
        "in-text citation", "references", "annotated bibliography", "claim",
        "evidence", "warrant", "thesis statement", "academic tone", "scholarly",
        "peer-reviewed", "formal register",
    ],
    "summarize paraphrase rewrite": [
        "summarize", "summarise", "summary", "paraphrase", "rephrase", "rewrite",
        "reword", "condense", "shorten", "simplify", "in your own words",
        "make it shorter", "tl;dr", "tldr", "key points", "bullet points",
        "main ideas", "abstract this", "summarize this article", "refine", "polish",
        "improve", "clean up", "make it flow", "make it more coherent",
        "总结", "改写", "润色",
    ],
    "grammar proofreading": [
        "proofread", "proofreading", "grammar", "fix my grammar", "correct my grammar",
        "fix my writing", "check this text", "grammar check", "spelling", "punctuation",
        "sentence structure", "awkward phrasing", "passive voice", "active voice",
        "improve clarity", "fix this sentence", "edit this paragraph",
        "correct the english", "polish this text", "fix grammatical errors",
        "语法修改", "帮我润色",
    ],
    "resume cv job application": [
        "resume", "cv", "curriculum vitae", "cover letter", "job application",
        "work experience", "skills section", "objective statement", "summary statement",
        "bullet points resume", "action verbs", "tailor resume", "ats-friendly",
        "linkedin profile", "professional summary", "references", "education section",
        "achievements", "accomplishments", "product owner", "pega", "customer service",
        "key skills", "key competencies", "hard skills", "soft skills",
    ],
    "email business writing": [
        "write an email", "business email", "formal email", "professional email",
        "write a letter", "formal letter", "write a memo", "business proposal",
        "write a report", "resignation letter", "complaint email", "follow-up email",
        "introduction email", "thank you email", "meeting agenda",
        "internal communication", "stakeholder update", "request for information",
        "escalation email", "workplace communication",
    ],

    # ── Commerce & Marketing ───────────────────────────────────────────────────
    "etsy ecommerce listings": [
        "etsy title", "etsy listing", "etsy description", "etsy seo", "etsy keywords",
        "print on demand", "tshirt design", "mug design", "art print", "printful",
        "redbubble", "merch", "product title", "product description", "shopify listing",
        "amazon listing", "140 characters", "no ampersand", "pipe separator",
        "artwork description", "digital download", "home decor", "wall art",
        "apparel", "dimensions", "commercial license", "stock photo", "fiverr gig",
        "repeat this string",
    ],
    "marketing seo copywriting": [
        "seo", "search engine optimisation", "search engine optimization",
        "keyword research", "meta description", "meta title", "content marketing",
        "social media strategy", "instagram caption", "facebook post", "brand voice",
        "copywriting", "ad copy", "call to action", "cta", "landing page copy",
        "value proposition", "usp", "unique selling proposition", "email newsletter",
        "content calendar", "engagement rate", "hashtags", "viral content",
        "target audience", "buyer persona",
    ],
    "youtube content creation": [
        "youtube", "youtube description", "video script", "youtube title",
        "thumbnail", "content creator", "channel", "subscribers", "views",
        "monetisation", "social media content", "tiktok", "instagram reel", "shorts",
        "blog post", "newsletter", "content strategy", "viral video", "hook",
        "intro script", "outro script", "voiceover script", "how to grow on youtube",
        "youtube seo", "content calendar", "podcast script", "streaming",
        "tweet", "social post",
    ],
    "social media reply generation": [
        "write a reply", "reply to this", "respond to this comment", "write a response",
        "how should i reply", "what should i say", "craft a response",
        "write a comment", "reply to my comment", "twitter reply", "instagram reply",
        "facebook comment", "comment response", "reply tweet", "write a message",
    ],

    # ── Translation & Language ─────────────────────────────────────────────────
    "translation multilingual": [
        "translate", "translation", "translate to", "translate into",
        "translate this to", "in french", "in spanish", "in german", "in chinese",
        "in japanese", "in russian", "in arabic", "in portuguese", "in korean",
        "in italian", "in hindi", "in turkish", "in polish", "in dutch",
        "native translation", "fluent translation", "idiomatic", "without cutting",
        "翻译成", "帮我翻译", "翻译为地道的", "Переведи", "ترجم",
        "traduit en français", "traduce esto", "traduce",
    ],
    "language learning": [
        "language learning", "learn spanish", "learn french", "learn japanese",
        "learn chinese", "learn german", "learn arabic", "vocabulary", "fluency",
        "grammar rule", "pronunciation", "phrase", "sentence pattern",
        "language exchange", "jlpt", "hsk", "ielts", "toefl", "speaking practice",
        "listening comprehension", "active vocabulary", "passive vocabulary",
        "idiomatic expression", "slang", "conversational", "beginner", "intermediate",
        "advanced", "increase vocabulary",
    ],
    "language simplification": [
        "simplify", "make it simpler", "make it easier to understand",
        "explain like i'm five", "explain like i'm ten", "explain like i'm a child",
        "explain like i'm a beginner", "simplify this text", "make this more concise",
        "make this more clear", "rewrite in simpler language", "dumb it down",
        "make it more accessible", "plain language", "layman's terms", "easier to read",
    ],

    # ── STEM ───────────────────────────────────────────────────────────────────
    "math algebra calculus": [
        "calculate", "equation", "solve", "algebra", "calculus", "integral",
        "derivative", "probability", "statistics", "linear algebra", "matrix",
        "eigenvalue", "vector", "combinatorics", "permutation", "combination",
        "proof", "theorem", "number theory", "discrete math", "differential equation",
        "limit", "series", "set theory", "binomial", "bayes theorem", "expected value",
        "standard deviation", "chi squared", "hypothesis testing", "p-value",
        "non-negative integer", "euclidean norm",
    ],
    "science biology physics chemistry": [
        "biology", "chemistry", "physics", "evolution", "quantum mechanics",
        "wave function", "molecule", "atom", "cell", "genetics", "dna", "rna",
        "protein synthesis", "photosynthesis", "thermodynamics", "newton's laws",
        "electromagnetism", "radioactive decay", "periodic table", "chemical reaction",
        "enzyme", "metabolism", "ecology", "climate change", "carbon cycle",
        "neuroscience", "anatomy", "cellular biology", "biochemistry",
        "organic chemistry", "vsepr", "electronegativity",
    ],

    # ── Humanities & Social Sciences ──────────────────────────────────────────
    "history civilizations": [
        "history", "historical", "ancient history", "medieval", "world war",
        "roman empire", "greek civilization", "ottoman empire", "byzantine", "mongol",
        "renaissance", "enlightenment", "colonialism", "revolution",
        "french revolution", "industrial revolution", "cold war", "vietnam war",
        "civil war", "dynasty", "han dynasty", "ming", "qing", "pharaoh",
        "ancient egypt", "mesopotamia", "conquistadors", "hannibal", "alps",
        "elephants", "nazi", "hitler", "cucuteni-trypillia",
    ],
    "philosophy ethics": [
        "philosophy", "ethics", "morality", "metaphysics", "ontology", "epistemology",
        "existentialism", "kantian", "categorical imperative", "utilitarianism",
        "consequentialism", "deontology", "free will", "determinism", "consciousness",
        "mind-body problem", "plato", "aristotle", "nietzsche", "descartes", "hume",
        "kant", "socrates", "phenomenology", "virtue ethics", "social contract",
        "justice", "rights", "trolley problem", "moral relativism",
        "what is the meaning of",
    ],
    "psychology behavior": [
        "psychology", "cognitive psychology", "behavioral science", "personality type",
        "mbti", "big five", "introvert", "extrovert", "carl jung", "archetypes",
        "defense mechanisms", "cognitive bias", "attachment theory", "trauma response",
        "emotional intelligence", "motivation", "maslow's hierarchy", "self-esteem",
        "habit formation", "procrastination", "willpower", "mindset", "cbt",
        "cognitive distortion", "behavior change", "reward", "conditioning",
        "operant conditioning",
    ],
    "politics current events": [
        "politics", "government", "election", "democracy", "policy", "president",
        "congress", "parliament", "republican", "democrat", "voting", "legislation",
        "war in ukraine", "russia ukraine", "sanctions", "zelenskyy", "putin", "nato",
        "gaza", "palestine", "israel", "hamas", "netanyahu", "ceasefire", "idf",
        "october 7", "climate policy", "immigration policy", "abortion rights",
        "gun control", "supreme court", "biden", "trump", "eu politics",
        "china taiwan", "south china sea", "政治", "乌克兰战争", "巴以冲突",
    ],
    "religion spirituality": [
        "god", "religion", "spirituality", "faith", "prayer", "meditation",
        "bible", "scripture", "quran", "torah", "talmud", "hadith", "buddhism",
        "hinduism", "christianity", "islam", "sikhism", "taoism", "afterlife",
        "soul", "heaven", "hell", "karma", "reincarnation", "enlightenment",
        "theology", "divine", "holy", "sin", "salvation", "prophet", "monk",
        "sufi", "yoga", "mindfulness", "cosmic connection", "الله", "الإيمان",
    ],

    # ── Health & Wellbeing ─────────────────────────────────────────────────────
    "health medical": [
        "symptom", "diagnosis", "treatment", "medication", "disease", "illness",
        "condition", "pain", "fever", "infection", "surgery", "doctor", "hospital",
        "prescription", "over-the-counter", "side effects", "chronic", "acute",
        "autoimmune", "cardiovascular", "neurological", "cancer", "diabetes",
        "hypertension", "blood pressure", "carotid artery", "imt",
        "intima-media thickness", "vitamin", "supplement", "dosage",
        "症状", "疾病", "药物",
    ],
    "mental health therapy": [
        "anxiety", "depression", "mental health", "therapy", "therapist",
        "counseling", "ptsd", "trauma", "bipolar disorder", "borderline personality",
        "ocd", "panic attack", "self-harm", "suicidal thoughts", "emotional regulation",
        "cbt", "dbt", "cognitive behavioral therapy", "dialectical behavior therapy",
        "grief", "loss", "loneliness", "burnout", "stress", "overwhelm",
        "coping strategies", "support group", "antidepressant", "ssris",
    ],
    "nutrition fitness diet": [
        "diet", "nutrition", "calories", "caloric deficit", "weight loss",
        "weight gain", "exercise", "workout", "fitness plan", "meal plan",
        "protein", "carbohydrates", "fat", "keto", "ketogenic", "vegan",
        "vegetarian", "intermittent fasting", "bmi", "body mass index", "gym",
        "cardio", "resistance training", "strength training", "macros",
        "micronutrients", "supplements", "sit-ups", "core exercises", "lean body",
        "fat loss", "muscle building",
    ],

    # ── Lifestyle & Entertainment ──────────────────────────────────────────────
    "travel tourism geography": [
        "travel", "tourism", "visa", "passport", "airport", "flight", "layover",
        "hotel", "accommodation", "itinerary", "destination", "sightseeing",
        "backpacking", "travel guide", "travel tips", "transit visa",
        "transfer flight", "can i leave the airport", "tourist attractions",
        "travel insurance", "exchange rate", "currency", "best time to visit",
        "旅游", "签证", "出行",
    ],
    "food recipes cooking": [
        "recipe", "ingredient", "cook", "bake", "cooking method", "dish", "cuisine",
        "meal prep", "restaurant", "snack", "dessert", "appetiser", "main course",
        "vegan recipe", "gluten-free", "dairy-free", "how to make", "step by step",
        "cooking tips", "kitchen tools", "seasoning", "spice", "sauce",
        "how long to bake", "temperature", "substitution", "correct way to make",
        "食谱", "做法", "烹饪",
    ],
    "music lyrics production": [
        "lyrics", "song", "melody", "chord progression", "compose", "music theory",
        "beat", "verse", "chorus", "bridge", "hook", "rap", "hip hop", "r&b", "pop",
        "country", "jazz", "genre", "artist", "album", "playlist", "music production",
        "daw", "fl studio", "ableton", "mixing", "mastering", "bass line",
        "drum pattern", "vocal harmony", "sample", "bpm", "key signature",
        "musical notation", "songwriting", "blackpink", "k-pop", "歌词", "作曲",
    ],
    "video games": [
        "video game", "gta", "call of duty", "fortnite", "minecraft", "roblox",
        "steam", "playstation", "xbox", "nintendo", "esports", "game review",
        "walkthrough", "game tips", "cheat codes", "game strategy", "boss fight",
        "achievement", "trophy", "open world", "rpg", "shooter", "fighting game",
        "game lore", "gaming setup", "pc gaming", "console gaming",
        "game recommendation", "game mod", "overwatch", "tracer", "widowmaker",
        "final fantasy", "sonic", "kirby", "pizza tower", "hollow knight", "cuphead",
    ],
    "tabletop rpg dnd": [
        "dungeons and dragons", "d&d", "dnd", "tabletop rpg", "pathfinder",
        "warhammer", "character sheet", "character creation", "stat block",
        "encounter", "campaign", "dungeon master", "dm", "player character", "npc",
        "quest", "loot table", "monster", "cr", "challenge rating", "dice roll",
        "spell slot", "homebrew", "board game", "scp foundation", "scp-",
        "class", "level", "skill check", "saving throw", "initiative",
    ],
    "astrology tarot esoteric": [
        "astrology", "zodiac", "horoscope", "birth chart", "rising sign", "sun sign",
        "moon sign", "tarot", "tarot reading", "numerology", "chakra", "aura",
        "crystal healing", "manifestation", "law of attraction", "spiritual awakening",
        "psychic", "clairvoyant", "angel number", "synchronicity", "astral projection",
        "lucid dreaming", "reiki", "energy healing", "cosmic connection", "universe",
        "higher self", "spiritual journey",
    ],
    "relationship dating social": [
        "relationship", "dating", "marriage", "friendship", "breakup", "divorce",
        "communication", "romance", "partner", "love", "conflict resolution",
        "jealousy", "trust", "cheating", "infidelity", "social skills", "loneliness",
        "rejection", "crush", "long-distance relationship", "toxic relationship",
        "healthy relationship", "setting boundaries", "attachment style",
        "anxious attachment", "avoidant", "family conflict", "response to send",
    ],
    "parenting children education": [
        "parenting", "children", "kids", "child development", "bedtime story",
        "homework help", "age-appropriate", "kindergarten", "primary school",
        "elementary school", "toddler", "teenager", "adolescent", "learning disability",
        "adhd in children", "screen time", "discipline", "positive reinforcement",
        "developmental milestone", "preschool", "read aloud", "children's book",
        "single mother", "raising children", "newborn", "baby care", "playtime",
    ],
    "greeting casual chat": [
        "hello", "hi there", "hey", "good morning", "good afternoon", "good evening",
        "how are you", "how are you doing", "what's up", "nice to meet you",
        "tell me about yourself", "what can you do", "what are you capable of",
        "i'm bored", "let's chat", "just chatting", "casual conversation",
        "can you help me", "i need help with", "please help me",
    ],
    "ai model identity questions": [
        "are you an ai", "are you a robot", "are you chatgpt", "who made you",
        "what model are you", "are you gpt", "which version", "what version are you",
        "are you sentient", "do you have feelings", "do you have emotions",
        "can you feel", "are you conscious", "are you real", "what llm are you",
        "who created you", "anthropic", "openai made you",
    ],

    # ── Productivity & Self-Development ───────────────────────────────────────
    "productivity self improvement": [
        "productivity", "time management", "goal setting", "habit formation",
        "self-improvement", "morning routine", "focus", "procrastination",
        "discipline", "journaling", "deep work", "pomodoro technique",
        "task prioritisation", "to-do list", "inbox zero", "motivation", "willpower",
        "mindset shift", "accountability", "atomic habits", "growth mindset",
        "getting things done", "gtd", "work-life balance", "burnout prevention",
        "self-care routine", "minimalist tone",
    ],
    "career development workplace": [
        "career", "professional development", "leadership", "management",
        "performance review", "promotion", "job interview", "workplace communication",
        "teamwork", "conflict at work", "networking", "mentoring", "coaching",
        "leadership coaching", "personal brand", "public speaking", "presentation",
        "negotiation", "salary negotiation", "remote work", "hybrid work",
        "onboarding", "workplace culture", "employee retention", "feedback delivery",
    ],

    # ── Finance & Law ──────────────────────────────────────────────────────────
    "finance investing crypto": [
        "invest", "investing", "stock market", "portfolio", "etf", "index fund",
        "s&p 500", "cryptocurrency", "bitcoin", "ethereum", "crypto wallet",
        "defi", "nft", "blockchain", "web3", "forex", "exchange rate", "interest rate",
        "loan", "emi", "monthly instalment", "mortgage", "budget", "financial planning",
        "savings", "tax", "accounting", "p&l", "revenue", "startup",
        "venture capital", "business plan", "break-even", "roi", "cost classification",
        "cost accounting", "zuora", "subscription billing",
    ],
    "legal contracts compliance": [
        "legal", "lawyer", "attorney", "lawsuit", "contract", "terms of service",
        "employment law", "copyright", "intellectual property", "trademark", "patent",
        "gdpr", "data protection", "non-disclosure agreement", "nda",
        "breach of contract", "jurisdiction", "court", "litigation", "tenant rights",
        "landlord", "criminal law", "civil law", "legal advice", "questionable clause",
        "presumption of innocence", "international law",
    ],

    # ── Education ──────────────────────────────────────────────────────────────
    "education curriculum teaching": [
        "curriculum", "lesson plan", "teaching strategy", "teaching method",
        "classroom", "homework", "assignment", "learning objective", "k-12",
        "grade level", "pedagogy", "common core", "nctm", "standards", "rubric",
        "formative assessment", "summative assessment", "differentiated instruction",
        "student engagement", "stem education", "project-based learning",
        "problem-based learning", "educational technology", "e-learning", "lms",
    ],

    # ── Art & Design ──────────────────────────────────────────────────────────
    "image generation art design": [
        "image generation", "art generation", "ai art", "digital art", "concept art",
        "character design", "environment design", "art prompt", "dalle-2", "midjourney",
        "stable diffusion", "art style", "color palette", "composition",
        "visual storytelling", "illustration", "graphic design", "logo design",
        "poster design", "album cover", "book cover", "fashion design",
        "interior design", "architectural design", "draw",
    ],
    "photography editing": [
        "photography", "photo editing", "lightroom", "photoshop", "photo retouching",
        "portrait photography", "landscape photography", "street photography",
        "black and white photography", "long exposure", "hdr photography",
        "photo composition", "golden hour", "rule of thirds", "photo filter",
        "color grading", "photo manipulation", "photo restoration", "photo enhancement",
        "photo correction", "photo touch-up", "photo cropping", "photo resizing",
        "photo background removal", "photo color correction", "photo sharpening",
    ],
}

# ── Tagging logic ──────────────────────────────────────────────────────────────
#
# Precompile one regex per topic at import time.  Using word-boundary anchors
# (\b) prevents short keywords from false-matching inside longer words — the
# classic example being "tween" matching inside "between" with naive `in`.
#
# Strategy per keyword:
#   • If the keyword starts/ends with a word character (letter, digit, _) we
#     attach \b on that side so it must land on a real word boundary.
#   • If the keyword starts/ends with punctuation or non-ASCII we leave that
#     side open, because \b is meaningless next to a non-word character anyway
#     (e.g. "--ar", "/imagine", "Lua编程").
#
# All keywords are lowercased to match the lowercased conversation text.
#
# MIN_KEYWORD_HITS: how many distinct keywords from a topic must appear in the
# conversation before that tag is applied.  2 means a single word can no longer
# trigger a tag on its own.  Set to 1 to restore the original any-match behaviour.

MIN_KEYWORD_HITS = 1


def _word_char(c: str) -> bool:
    return c.isascii() and (c.isalnum() or c == "_")

def _make_topic_pattern(keywords: list) -> re.Pattern:
    parts = []
    for kw in keywords:
        kw_l = kw.lower()
        escaped = re.escape(kw_l)
        prefix = r"\b" if _word_char(kw_l[0]) else ""
        suffix = r"\b" if _word_char(kw_l[-1]) else ""
        parts.append(prefix + escaped + suffix)
    # Longest alternatives first so greedy alternation doesn't swallow partial matches
    parts.sort(key=len, reverse=True)
    return re.compile("|".join(parts))

_TOPIC_PATTERNS: dict[str, re.Pattern] = {
    topic: _make_topic_pattern(keywords)
    for topic, keywords in TOPIC_KEYWORDS.items()
}


def get_tags(messages) -> list:
    if not hasattr(messages, "__iter__") or len(messages) == 0:
        return ["untagged"]
    full_text = " ".join(
        msg.get("content", "") if isinstance(msg, dict) else str(msg)
        for msg in messages
    ).lower()
    tags = []
    for topic, pattern in _TOPIC_PATTERNS.items():
        if not pattern.search(full_text):
            continue
        # Count distinct keywords that actually appear (not total occurrences).
        # findall returns the matched string at each position; set() deduplicates.
        if len(set(pattern.findall(full_text))) >= MIN_KEYWORD_HITS:
            tags.append(topic)
    return tags if tags else ["untagged"]


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    if not INPUT_FILES:
        raise FileNotFoundError(f"No parquet files found in {BASE}")

    # Remove stale output so we always write a fresh file
    if OUT_PARQ.exists():
        OUT_PARQ.unlink()
        print(f"Removed existing {OUT_PARQ.name}")

    parquet_writer = None
    rows_done = 0
    t0 = time.time()

    print(f"Input:    {len(INPUT_FILES)} files ({INPUT_FILES[0].name} → {INPUT_FILES[-1].name})")
    print(f"Output:   {OUT_PARQ.name}\n")

    for src in INPUT_FILES:
        df = pd.read_parquet(src)
        df["tags"] = df["conversation"].apply(get_tags)
        df["tags"] = df["tags"].apply(json.dumps)

        table = pa.Table.from_pandas(df, preserve_index=False)
        if parquet_writer is None:
            parquet_writer = pq.ParquetWriter(str(OUT_PARQ), table.schema)
        parquet_writer.write_table(table)

        rows_done += len(df)
        elapsed = time.time() - t0
        rate = rows_done / elapsed
        print(f"  {src.name}  |  {rows_done:>8,} rows  |  {elapsed:5.1f}s  |  {rate:,.0f} rows/s")

    if parquet_writer:
        parquet_writer.close()

    elapsed = time.time() - t0
    print(f"\nDone — {rows_done:,} rows in {elapsed:.1f}s")
    print(f"  Parquet : {OUT_PARQ}  ({OUT_PARQ.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
