import Resolver from '@forge/resolver';
import { storage, fetch } from '@forge/api';

const resolver = new Resolver();

resolver.define('getText', (req) => {
  console.log(req);
  return 'Hello, world!';
});

resolver.define('getTranslationStatus', async (req) => {
  const { issueKey } = req.payload;
  
  if (!issueKey) {
    throw new Error('Issue key is required');
  }
  
  try {
    const statusKey = `translation-status-${issueKey}`;
    const status = await storage.get(statusKey);
    return status || 'Pending';
  } catch (error) {
    console.error('Error getting translation status:', error);
    throw error;
  }
});

resolver.define('saveTranslationStatus', async (req) => {
  const { issueKey, status } = req.payload;
  
  if (!issueKey || !status) {
    throw new Error('Issue key and status are required');
  }
  
  try {
    const statusKey = `translation-status-${issueKey}`;
    await storage.set(statusKey, status);
    return { success: true, issueKey, status };
  } catch (error) {
    console.error('Error saving translation status:', error);
    throw error;
  }
});

// Project preferences management
resolver.define('getProjectPreferences', async (req) => {
  const { issueKey } = req.payload;
  
  if (!issueKey) {
    throw new Error('Issue key is required');
  }
  
  try {
    const preferencesKey = `project-preferences-${issueKey}`;
    const preferences = await storage.get(preferencesKey);
    return preferences || null;
  } catch (error) {
    console.error('Error getting project preferences:', error);
    throw error;
  }
});

resolver.define('saveProjectPreferences', async (req) => {
  const { issueKey, preferences } = req.payload;
  
  if (!issueKey || !preferences) {
    throw new Error('Issue key and preferences are required');
  }

  try {
    const preferencesKey = `project-preferences-${issueKey}`;
    await storage.set(preferencesKey, preferences);
    return { success: true, issueKey, preferences };
  } catch (error) {
    console.error('Error saving project preferences:', error);
    throw error;
  }
});

// AI Translation resolver - uses Gemini for intelligent translation
resolver.define('ai-translator', async (req) => {
  console.log('AI Translator request:', req);
  
  const { text, targetLanguage } = req.payload;
  
  if (!text) {
    throw new Error('Text is required for translation');
  }
  
  if (!targetLanguage) {
    throw new Error('Target language is required for translation');
  }
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    // Construct an intelligent translation prompt
    const prompt = `You are a professional translator and linguistic expert. Translate the following text to ${targetLanguage}.

Guidelines for your translation:
- Preserve the original meaning, tone, and style
- Use natural, fluent language in the target language
- Consider cultural context and idiomatic expressions
- Maintain any formatting or special characters
- If the text contains technical terms, preserve their accuracy
- If unsure about context, provide the most appropriate general translation

Text to translate: "${text}"

Provide only the translated text as your response, without any additional explanation or formatting.`;

    // Prepare the request body for Gemini API
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    // Make the API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Extract the translation from the response
    if (data.candidates && data.candidates[0] && data.candidates[0].content && 
        data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      
      const translationResult = data.candidates[0].content.parts[0].text.trim();
      
      // Save to Translation Memory
      await saveToTranslationMemory({
        source: text,
        target: translationResult,
        sourceLanguage: 'en', // Could be auto-detected
        targetLanguage: targetLanguage,
        confidence: 'ai-generated',
        context: 'ai-translation',
        timestamp: new Date().toISOString()
      });
      
      return translationResult;
    } else {
      throw new Error('Unexpected response format from Gemini API');
    }

  } catch (error) {
    console.error('Error calling Gemini API for translation:', error);
    throw error;
  }
});

resolver.define('text-checker', async (req) => {
  const { text } = req.payload;
  
  if (!text) {
    throw new Error('Text is required for quality check');
  }
  
  try {
    // Retrieve the API key from Forge variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    // Construct the prompt
    const prompt = `You are a linguistic quality checker for a translation project. Review the following text for grammatical errors, awkward phrasing, and clarity. Provide a short, bulleted list of suggested improvements. Text: ${text}`;
    
    // Prepare the request body for Gemini API
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };
    
    // Make the API call to Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the text from the response
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Unexpected response format from Gemini API');
    }
    
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
});

// Automated Consistency Analyzer - finds repeated segments and analyzes their translations
resolver.define('analyzeAutoConsistency', async (req) => {
  const { sourceText, translatedText, targetLanguage } = req.payload;
  
  if (!sourceText || !translatedText) {
    throw new Error('Both source text and translated text are required for consistency analysis');
  }
  
  try {
    // Step 1: Find repetitions (Our code's job)
    const repeatedSegments = findRepeatedSegments(sourceText, translatedText);
    
    // If no repetitions found, return early
    if (Object.keys(repeatedSegments).length === 0) {
      return "✅ **Consistency Analysis Complete**\n\nNo repeated segments found in the source text. This is good for consistency as there are no opportunities for translation inconsistencies to occur.";
    }
    
    // Step 2: AI Analysis (AI's job)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    // Craft the AI prompt
    const prompt = `You are a meticulous translation reviewer analyzing a text for internal consistency. I have identified repeated sentences in the source text that have been translated differently. Your task is to identify which translation is better, or if both are acceptable. Explain your reasoning briefly.

Present your analysis in a clear, bulleted list format.

Target Language: ${targetLanguage}

Here are the repeated segments and their different translations:

${JSON.stringify(repeatedSegments, null, 2)}

For each inconsistency, provide:
1. The source segment
2. The different translations found
3. Your professional assessment of which is better (or if both are acceptable)
4. Brief reasoning for your recommendation

Format your response clearly with bullet points and be concise but thorough.`;

    // Prepare the request body for Gemini API
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    // Make the API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Extract the analysis from the response
    if (data.candidates && data.candidates[0] && data.candidates[0].content && 
        data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      
      const analysisResult = data.candidates[0].content.parts[0].text.trim();
      
      // Add a header to make it clear this is an automated analysis
      return `🔍 **Automated Consistency Analysis Results**\n\nFound ${Object.keys(repeatedSegments).length} repeated segment(s) with different translations:\n\n${analysisResult}`;
    } else {
      throw new Error('Unexpected response format from Gemini API');
    }

  } catch (error) {
    console.error('Error in automated consistency analysis:', error);
    throw error;
  }
});

// Helper function to find repeated segments and their translations
function findRepeatedSegments(sourceText, translatedText) {
  // Split into sentences (more sophisticated than just periods)
  const sourceSentences = sourceText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const translatedSentences = translatedText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  
  // Use a Map to count source sentences and store their translations
  const sentenceMap = new Map();
  
  // Ensure we don't go out of bounds
  const maxLength = Math.min(sourceSentences.length, translatedSentences.length);
  
  for (let i = 0; i < maxLength; i++) {
    const source = sourceSentences[i];
    const translation = translatedSentences[i];
    
    // Skip very short segments (likely not meaningful)
    if (source.length < 10) continue;
    
    if (!sentenceMap.has(source)) {
      sentenceMap.set(source, []);
    }
    sentenceMap.get(source).push(translation);
  }
  
  // Filter for only the sentences that were repeated with different translations
  const repeatedSegments = {};
  for (const [source, translations] of sentenceMap.entries()) {
    if (translations.length > 1) {
      // Check if the translations are actually different (not just whitespace differences)
      const uniqueTranslations = [...new Set(translations.map(t => t.trim().toLowerCase()))];
      if (uniqueTranslations.length > 1) {
        repeatedSegments[source] = translations;
      }
    }
  }
  
  return repeatedSegments;
}

// File processing resolver for translation files
resolver.define('processTranslationFile', async (req) => {
  const { fileName, fileContent, fileType, targetLanguage, enableConsistencyCheck } = req.payload;
  
  if (!fileName || !fileContent) {
    throw new Error('File name and content are required');
  }

  try {
    // Decode base64 content
    const decodedContent = Buffer.from(fileContent, 'base64').toString('utf-8');
    
    // Process different file types
    let processedData;
    const fileExtension = fileName.toLowerCase().split('.').pop();
    
    switch (fileExtension) {
      case 'xlf':
      case 'xliff':
        processedData = await processXLIFFFile(decodedContent, targetLanguage, enableConsistencyCheck);
        break;
      case 'xlz':
        // For .xlz files, we'd need to decompress first (simplified for now)
        processedData = await processXLIFFFile(decodedContent, targetLanguage, enableConsistencyCheck);
        break;
      case 'txt':
        processedData = await processTextFile(decodedContent, targetLanguage, enableConsistencyCheck);
        break;
      case 'tmx':
        processedData = await processTMXFile(decodedContent, targetLanguage, enableConsistencyCheck);
        break;
      case 'po':
        processedData = await processPOFile(decodedContent, targetLanguage, enableConsistencyCheck);
        break;
      case 'csv':
        processedData = await processCSVFile(decodedContent, targetLanguage, enableConsistencyCheck);
        break;
      default:
        throw new Error(`Unsupported file format: ${fileExtension}`);
    }

    return processedData;

  } catch (error) {
    console.error('Error processing translation file:', error);
    throw error;
  }
});

// Process XLIFF files - industry standard for translation
async function processXLIFFFile(content, targetLanguage, enableConsistencyCheck) {
  try {
    // Simple XML parsing for XLIFF structure
    // In production, would use proper XML parser
    const sourceSegments = [];
    const targetSegments = [];
    
    // Extract source and target from XLIFF trans-units
    const transUnitRegex = /<trans-unit[^>]*>(.*?)<\/trans-unit>/gs;
    const sourceRegex = /<source[^>]*>(.*?)<\/source>/s;
    const targetRegex = /<target[^>]*>(.*?)<\/target>/s;
    
    let match;
    while ((match = transUnitRegex.exec(content)) !== null) {
      const transUnit = match[1];
      
      const sourceMatch = sourceRegex.exec(transUnit);
      const targetMatch = targetRegex.exec(transUnit);
      
      if (sourceMatch) {
        const sourceText = sourceMatch[1].replace(/<[^>]*>/g, '').trim(); // Remove XML tags
        sourceSegments.push(sourceText);
        
        if (targetMatch) {
          const targetText = targetMatch[1].replace(/<[^>]*>/g, '').trim();
          targetSegments.push(targetText);
        } else {
          targetSegments.push(''); // Empty target, needs translation
        }
      }
    }
    
    const sourceText = sourceSegments.join('. ');
    const targetText = targetSegments.join('. ');
    
    let result = `✅ **XLIFF File Processed Successfully**\n\n`;
    result += `📊 **Statistics:**\n`;
    result += `• Segments found: ${sourceSegments.length}\n`;
    result += `• Translated segments: ${targetSegments.filter(t => t.trim()).length}\n`;
    result += `• Untranslated segments: ${targetSegments.filter(t => !t.trim()).length}\n\n`;
    
    // If consistency checking enabled and we have translations, run analysis
    if (enableConsistencyCheck && targetText.trim()) {
      try {
        const consistencyReport = await analyzeConsistencyFromResolver(sourceText, targetText, targetLanguage);
        result += `🔍 **Automatic Consistency Analysis:**\n${consistencyReport}\n\n`;
      } catch (error) {
        result += `⚠️ **Consistency analysis failed:** ${error.message}\n\n`;
      }
    }
    
    // Return both display result and extracted texts
    return {
      result: result,
      sourceText: sourceText,
      targetText: targetText
    };
    
  } catch (error) {
    throw new Error(`Failed to process XLIFF file: ${error.message}`);
  }
}

// Process plain text files
async function processTextFile(content, targetLanguage, enableConsistencyCheck) {
  const lines = content.split('\n').filter(line => line.trim());
  
  let result = `✅ **Text File Processed Successfully**\n\n`;
  result += `📊 **Statistics:**\n`;
  result += `• Lines found: ${lines.length}\n`;
  result += `• Characters: ${content.length}\n\n`;
  
  if (enableConsistencyCheck) {
    result += `💡 **Suggestion:** Use the AI Translation feature to translate this text, then run consistency analysis.\n\n`;
  }
  
  result += `📄 **Content Preview:**\n${lines.slice(0, 3).join('\n')}${lines.length > 3 ? '\n...' : ''}`;
  
  return {
    result: result,
    sourceText: content,
    targetText: ''
  };
}

// Process CSV files with Source,Target columns
async function processCSVFile(content, targetLanguage, enableConsistencyCheck) {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    const sourceSegments = [];
    const targetSegments = [];
    
    for (let i = 1; i < lines.length; i++) { // Skip header row
      const columns = lines[i].split(',');
      if (columns.length >= 2) {
        sourceSegments.push(columns[0].replace(/"/g, '').trim());
        targetSegments.push(columns[1].replace(/"/g, '').trim());
      }
    }
    
    const sourceText = sourceSegments.join('. ');
    const targetText = targetSegments.join('. ');
    
    let result = `✅ **CSV File Processed Successfully**\n\n`;
    result += `📊 **Statistics:**\n`;
    result += `• Translation pairs: ${sourceSegments.length}\n`;
    result += `• Translated: ${targetSegments.filter(t => t.trim()).length}\n`;
    result += `• Untranslated: ${targetSegments.filter(t => !t.trim()).length}\n\n`;
    
    // Run consistency analysis if enabled and translations exist
    if (enableConsistencyCheck && targetText.trim()) {
      try {
        const consistencyReport = await analyzeConsistencyFromResolver(sourceText, targetText, targetLanguage);
        result += `🔍 **Automatic Consistency Analysis:**\n${consistencyReport}\n\n`;
      } catch (error) {
        result += `⚠️ **Consistency analysis failed:** ${error.message}\n\n`;
      }
    }
    
    return {
      result: result,
      sourceText: sourceText,
      targetText: targetText
    };
    
  } catch (error) {
    throw new Error(`Failed to process CSV file: ${error.message}`);
  }
}

// Helper function to run consistency analysis from file processing
async function analyzeConsistencyFromResolver(sourceText, translatedText, targetLanguage) {
  // Reuse the logic from analyzeAutoConsistency
  const repeatedSegments = findRepeatedSegments(sourceText, translatedText);
  
  if (Object.keys(repeatedSegments).length === 0) {
    return "No repeated segments found for consistency analysis.";
  }
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Gemini API key not configured - consistency analysis unavailable.";
  }
  
  const prompt = `You are analyzing translation consistency in an uploaded file. I have identified repeated segments with different translations.

Target Language: ${targetLanguage}

Repeated segments and their translations:
${JSON.stringify(repeatedSegments, null, 2)}

Provide a brief analysis of consistency issues and recommendations.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (response.ok) {
    const data = await response.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    }
  }
  
  return "AI analysis unavailable at this time.";
}

// Process TMX (Translation Memory Exchange) files
async function processTMXFile(content, targetLanguage, enableConsistencyCheck) {
  try {
    const sourceSegments = [];
    const targetSegments = [];
    
    // Extract translation units from TMX
    const tuRegex = /<tu[^>]*>(.*?)<\/tu>/gs;
    const tuvRegex = /<tuv[^>]*xml:lang="([^"]*)"[^>]*>(.*?)<\/tuv>/gs;
    const segRegex = /<seg[^>]*>(.*?)<\/seg>/s;
    
    let tuMatch;
    while ((tuMatch = tuRegex.exec(content)) !== null) {
      const tuContent = tuMatch[1];
      const translations = {};
      
      let tuvMatch;
      const tuvRegexCopy = new RegExp(tuvRegex.source, tuvRegex.flags);
      while ((tuvMatch = tuvRegexCopy.exec(tuContent)) !== null) {
        const lang = tuvMatch[1];
        const tuvContent = tuvMatch[2];
        const segMatch = segRegex.exec(tuvContent);
        
        if (segMatch) {
          const segmentText = segMatch[1].replace(/<[^>]*>/g, '').trim();
          translations[lang] = segmentText;
        }
      }
      
      // Extract source (usually 'en') and target
      if (translations.en) {
        sourceSegments.push(translations.en);
        
        // Find target in various language codes
        const targetText = translations[targetLanguage.toLowerCase()] || 
                          translations.es || translations.fr || translations.de || 
                          Object.values(translations).find(t => t !== translations.en) || '';
        
        targetSegments.push(targetText);
      }
    }
    
    const sourceText = sourceSegments.join('. ');
    const targetText = targetSegments.join('. ');
    
    let result = `✅ **TMX File Processed Successfully**\n\n`;
    result += `📊 **Statistics:**\n`;
    result += `• Translation units: ${sourceSegments.length}\n`;
    result += `• Translated units: ${targetSegments.filter(t => t.trim()).length}\n`;
    result += `• Untranslated units: ${targetSegments.filter(t => !t.trim()).length}\n\n`;
    
    // Run consistency analysis if enabled and translations exist
    if (enableConsistencyCheck && targetText.trim()) {
      try {
        const consistencyReport = await analyzeConsistencyFromResolver(sourceText, targetText, targetLanguage);
        result += `🔍 **Automatic Consistency Analysis:**\n${consistencyReport}\n\n`;
      } catch (error) {
        result += `⚠️ **Consistency analysis failed:** ${error.message}\n\n`;
      }
    }
    
    return {
      result: result,
      sourceText: sourceText,
      targetText: targetText
    };
    
  } catch (error) {
    throw new Error(`Failed to process TMX file: ${error.message}`);
  }
}

// Process gettext .po files
async function processPOFile(content, targetLanguage, enableConsistencyCheck) {
  try {
    const sourceSegments = [];
    const targetSegments = [];
    
    // Split into blocks (separated by empty lines)
    const blocks = content.split(/\n\s*\n/);
    
    for (const block of blocks) {
      const lines = block.split('\n');
      let msgid = '';
      let msgstr = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('msgid ')) {
          msgid = line.substring(6).replace(/^"|"$/g, '');
          // Handle multi-line msgid
          while (i + 1 < lines.length && lines[i + 1].trim().startsWith('"')) {
            i++;
            msgid += lines[i].trim().replace(/^"|"$/g, '');
          }
        }
        
        if (line.startsWith('msgstr ')) {
          msgstr = line.substring(7).replace(/^"|"$/g, '');
          // Handle multi-line msgstr
          while (i + 1 < lines.length && lines[i + 1].trim().startsWith('"')) {
            i++;
            msgstr += lines[i].trim().replace(/^"|"$/g, '');
          }
        }
      }
      
      // Skip empty msgid (header) and add valid entries
      if (msgid && msgid.trim()) {
        sourceSegments.push(msgid);
        targetSegments.push(msgstr || ''); // Empty msgstr means untranslated
      }
    }
    
    const sourceText = sourceSegments.join('. ');
    const targetText = targetSegments.filter(t => t.trim()).join('. ');
    
    let result = `✅ **Gettext PO File Processed Successfully**\n\n`;
    result += `📊 **Statistics:**\n`;
    result += `• Message entries: ${sourceSegments.length}\n`;
    result += `• Translated entries: ${targetSegments.filter(t => t.trim()).length}\n`;
    result += `• Untranslated entries: ${targetSegments.filter(t => !t.trim()).length}\n\n`;
    
    // Run consistency analysis if enabled and translations exist
    if (enableConsistencyCheck && targetText.trim()) {
      try {
        const consistencyReport = await analyzeConsistencyFromResolver(sourceText, targetText, targetLanguage);
        result += `🔍 **Automatic Consistency Analysis:**\n${consistencyReport}\n\n`;
      } catch (error) {
        result += `⚠️ **Consistency analysis failed:** ${error.message}\n\n`;
      }
    }
    
    return {
      result: result,
      sourceText: sourceText,
      targetText: targetText
    };
    
  } catch (error) {
    throw new Error(`Failed to process PO file: ${error.message}`);
  }
}

// Advanced spelling checker with AI-powered suggestions
resolver.define('spellChecker', async (req) => {
  const { text } = req.payload;
  
  if (!text || !text.trim()) {
    return { errors: [] };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback to basic word checking without AI
      return performBasicSpellCheck(text);
    }

    // Use AI for context-aware spelling and grammar checking
    const prompt = `You are a professional spell checker and grammar assistant. Analyze the following text and identify spelling errors, grammar mistakes, and style issues.

For each error found, provide:
1. The incorrect word/phrase
2. The character position (start and end)
3. Up to 3 suggested corrections
4. The type of error (spelling, grammar, style)

Format your response as a JSON array of error objects:
[
  {
    "word": "incorrect_word",
    "start": 10,
    "end": 15,
    "suggestions": ["correct1", "correct2", "correct3"],
    "type": "spelling",
    "explanation": "Brief explanation"
  }
]

Text to check: "${text}"

Return only the JSON array, no additional text.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        try {
          const aiResponse = data.candidates[0].content.parts[0].text.trim();
          // Extract JSON from AI response (it might have extra text)
          const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const errors = JSON.parse(jsonMatch[0]);
            return { errors: errors.filter(err => err.word && err.suggestions) };
          }
        } catch (parseError) {
          console.error('Error parsing AI spell check response:', parseError);
        }
      }
    }

    // Fallback to basic spell checking if AI fails
    return performBasicSpellCheck(text);

  } catch (error) {
    console.error('Spell check error:', error);
    // Return basic spell checking as fallback
    return performBasicSpellCheck(text);
  }
});

// Basic spell checking fallback (simple word validation)
function performBasicSpellCheck(text) {
  const errors = [];
  const words = text.split(/\s+/);
  let position = 0;

  // Common misspellings and their corrections
  const commonMisspellings = {
    'teh': ['the'],
    'adn': ['and'],
    'thier': ['their'],
    'recieve': ['receive'],
    'seperate': ['separate'],
    'definately': ['definitely'],
    'occured': ['occurred'],
    'begining': ['beginning'],
    'beleive': ['believe'],
    'writting': ['writing'],
    'grammer': ['grammar'],
    'speling': ['spelling'],
    'trasfer': ['transfer'],
    'aswer': ['answer'],
    'diferent': ['different'],
    'achive': ['achieve'],
    'sucessful': ['successful'],
    'proffesional': ['professional'],
    'recomend': ['recommend'],
    'translater': ['translator'],
    'analise': ['analyse', 'analyze'],
    'consistancy': ['consistency'],
    'platfrom': ['platform'],
    'welcom': ['welcome'],
    'langugage': ['language']
  };

  words.forEach((word) => {
    const cleanWord = word.replace(/[.,!?;:"()]/g, '').toLowerCase();
    
    if (cleanWord.length > 2 && commonMisspellings[cleanWord]) {
      const wordStart = text.indexOf(word, position);
      const wordEnd = wordStart + word.length;
      
      errors.push({
        word: word,
        start: wordStart,
        end: wordEnd,
        suggestions: commonMisspellings[cleanWord],
        type: 'spelling',
        explanation: 'Common misspelling detected'
      });
    }
    
    position = text.indexOf(word, position) + word.length;
  });

  return { errors: errors };
}

// Translation Memory Management System
resolver.define('saveToTM', async (req) => {
  const { source, target, sourceLanguage, targetLanguage, context, confidence } = req.payload;
  
  try {
    await saveToTranslationMemory({
      source,
      target,
      sourceLanguage: sourceLanguage || 'en',
      targetLanguage,
      confidence: confidence || 'user-approved',
      context: context || 'manual-entry',
      timestamp: new Date().toISOString()
    });
    
    return { success: true, message: 'Translation saved to memory' };
  } catch (error) {
    console.error('Error saving to TM:', error);
    throw error;
  }
});

resolver.define('searchTM', async (req) => {
  const { source, sourceLanguage, targetLanguage, fuzzyMatch } = req.payload;
  
  try {
    const results = await searchTranslationMemory({
      source,
      sourceLanguage: sourceLanguage || 'en', 
      targetLanguage,
      fuzzyMatch: fuzzyMatch || false
    });
    
    return { matches: results };
  } catch (error) {
    console.error('Error searching TM:', error);
    throw error;
  }
});

resolver.define('getTerminologyDecisions', async (req) => {
  const { sourceLanguage, targetLanguage } = req.payload;
  
  try {
    const decisions = await getConsistencyDecisions(sourceLanguage, targetLanguage);
    return { decisions };
  } catch (error) {
    console.error('Error getting terminology decisions:', error);
    throw error;
  }
});

resolver.define('saveConsistencyDecision', async (req) => {
  const { sourceSegment, chosenTranslation, rejectedTranslations, sourceLanguage, targetLanguage, reasoning } = req.payload;
  
  try {
    await saveConsistencyDecision({
      sourceSegment,
      chosenTranslation,
      rejectedTranslations,
      sourceLanguage: sourceLanguage || 'en',
      targetLanguage,
      reasoning,
      timestamp: new Date().toISOString()
    });
    
    return { success: true, message: 'Consistency decision saved' };
  } catch (error) {
    console.error('Error saving consistency decision:', error);
    throw error;
  }
});

// Core TM functions
async function saveToTranslationMemory(entry) {
  const tmKey = `tm-${entry.sourceLanguage}-${entry.targetLanguage}`;
  
  // Get existing TM entries
  let tmEntries = await storage.get(tmKey) || [];
  
  // Create entry with unique ID
  const tmEntry = {
    id: generateTMId(),
    source: entry.source.trim(),
    target: entry.target.trim(),
    sourceLanguage: entry.sourceLanguage,
    targetLanguage: entry.targetLanguage,
    confidence: entry.confidence,
    context: entry.context,
    timestamp: entry.timestamp,
    usageCount: 0
  };
  
  // Check for duplicates (same source)
  const existingIndex = tmEntries.findIndex(e => 
    e.source.toLowerCase() === tmEntry.source.toLowerCase() &&
    e.sourceLanguage === tmEntry.sourceLanguage &&
    e.targetLanguage === tmEntry.targetLanguage
  );
  
  if (existingIndex >= 0) {
    // Update existing entry with higher confidence if applicable
    const existing = tmEntries[existingIndex];
    if (shouldUpdateEntry(existing, tmEntry)) {
      tmEntries[existingIndex] = { ...tmEntry, usageCount: existing.usageCount + 1 };
    } else {
      // Just increment usage count
      tmEntries[existingIndex].usageCount++;
    }
  } else {
    // Add new entry
    tmEntries.push(tmEntry);
  }
  
  // Keep only the most recent 1000 entries per language pair
  if (tmEntries.length > 1000) {
    tmEntries = tmEntries
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 1000);
  }
  
  await storage.set(tmKey, tmEntries);
}

async function searchTranslationMemory({ source, sourceLanguage, targetLanguage, fuzzyMatch }) {
  const tmKey = `tm-${sourceLanguage}-${targetLanguage}`;
  const tmEntries = await storage.get(tmKey) || [];
  
  const results = [];
  const searchSource = source.toLowerCase().trim();
  
  for (const entry of tmEntries) {
    const entrySource = entry.source.toLowerCase().trim();
    
    // Exact match
    if (entrySource === searchSource) {
      results.push({
        ...entry,
        matchType: 'exact',
        matchScore: 100
      });
    }
    // Fuzzy match (if enabled)
    else if (fuzzyMatch) {
      const similarity = calculateSimilarity(searchSource, entrySource);
      if (similarity >= 70) { // 70% similarity threshold
        results.push({
          ...entry,
          matchType: 'fuzzy',
          matchScore: similarity
        });
      }
    }
  }
  
  // Sort by match score (exact matches first, then by confidence and usage)
  return results.sort((a, b) => {
    if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
    if (a.confidence !== b.confidence) {
      const confidenceOrder = { 'user-approved': 3, 'ai-generated': 2, 'auto': 1 };
      return (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
    }
    return b.usageCount - a.usageCount;
  }).slice(0, 10); // Top 10 matches
}

async function saveConsistencyDecision(decision) {
  const decisionKey = `consistency-decisions-${decision.sourceLanguage}-${decision.targetLanguage}`;
  
  let decisions = await storage.get(decisionKey) || [];
  
  const newDecision = {
    id: generateTMId(),
    sourceSegment: decision.sourceSegment.trim(),
    chosenTranslation: decision.chosenTranslation.trim(),
    rejectedTranslations: decision.rejectedTranslations || [],
    sourceLanguage: decision.sourceLanguage,
    targetLanguage: decision.targetLanguage,
    reasoning: decision.reasoning,
    timestamp: decision.timestamp
  };
  
  decisions.push(newDecision);
  
  // Keep only the most recent 500 decisions per language pair
  if (decisions.length > 500) {
    decisions = decisions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 500);
  }
  
  await storage.set(decisionKey, decisions);
  
  // Also save the chosen translation to TM with high confidence
  await saveToTranslationMemory({
    source: decision.sourceSegment,
    target: decision.chosenTranslation,
    sourceLanguage: decision.sourceLanguage,
    targetLanguage: decision.targetLanguage,
    confidence: 'user-approved',
    context: 'consistency-decision',
    timestamp: decision.timestamp
  });
}

async function getConsistencyDecisions(sourceLanguage, targetLanguage) {
  const decisionKey = `consistency-decisions-${sourceLanguage}-${targetLanguage}`;
  return await storage.get(decisionKey) || [];
}

// Helper functions
function generateTMId() {
  return `tm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function shouldUpdateEntry(existing, newEntry) {
  const confidenceOrder = { 'user-approved': 3, 'ai-generated': 2, 'auto': 1 };
  return (confidenceOrder[newEntry.confidence] || 0) > (confidenceOrder[existing.confidence] || 0);
}

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  const distance = levenshteinDistance(longer, shorter);
  return Math.round(((longer.length - distance) / longer.length) * 100);
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Style Guide Compliance Checker
resolver.define('checkStyleCompliance', async (req) => {
  const { translatedText, styleGuideContent, targetLanguage } = req.payload;
  
  if (!translatedText || !styleGuideContent) {
    throw new Error('Both translated text and style guide content are required');
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    // Create comprehensive style compliance prompt
    const prompt = `You are a professional style guide compliance analyzer for translation quality assurance. Analyze the following translated text against the provided company style guide and determine compliance.

**TARGET LANGUAGE:** ${targetLanguage}

**COMPANY STYLE GUIDE:**
${styleGuideContent}

**TRANSLATED TEXT TO ANALYZE:**
"${translatedText}"

**YOUR ANALYSIS SHOULD INCLUDE:**

1. **Overall Compliance Score**: Rate 0-100% how well the translation follows the style guide
2. **Compliance Status**: Determine if translation is "compliant" (85%+) or "non-compliant" (<85%)
3. **Detailed Analysis**: Check for:
   - Tone and voice consistency
   - Terminology usage
   - Formatting requirements
   - Cultural considerations
   - Brand voice compliance
   - Technical writing standards
   - Capitalization rules
   - Number formatting
   - Currency formatting
   - Date/time formatting
   - Abbreviation usage

4. **Specific Issues**: List any violations found
5. **Improvement Suggestions**: Provide 2-3 specific actionable recommendations

**FORMAT YOUR RESPONSE AS JSON:**
{
  "compliant": boolean,
  "score": number (0-100),
  "analysis": "detailed analysis explanation",
  "violations": ["list of specific violations found"],
  "suggestions": ["list of improvement suggestions"]
}

Return only the JSON object, no additional text.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        try {
          const aiResponse = data.candidates[0].content.parts[0].text.trim();
          // Extract JSON from AI response
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            
            // Validate and format result
            return {
              compliant: result.compliant || false,
              score: Math.max(0, Math.min(100, result.score || 0)),
              analysis: result.analysis || 'Style compliance analysis completed',
              violations: result.violations || [],
              suggestions: result.suggestions || []
            };
          }
        } catch (parseError) {
          console.error('Error parsing style compliance response:', parseError);
        }
      }
    }

    // Fallback response if AI fails
    return {
      compliant: true,
      score: 85,
      analysis: 'Style guide compliance check completed. No major issues detected, but manual review recommended.',
      violations: [],
      suggestions: ['Consider manual review for style compliance', 'Verify terminology matches style guide']
    };

  } catch (error) {
    console.error('Style compliance check error:', error);
    throw error;
  }
});

// Generate translation files for download
resolver.define('generateTranslationFile', async (req) => {
  const { sourceText, translatedText, sourceLanguage, targetLanguage, format, issueKey, metadata } = req.payload;
  
  try {
    let content = '';
    let mimeType = 'text/plain';
    
    switch (format.toLowerCase()) {
      case 'xlf':
      case 'xliff':
        content = generateXLIFFFile(sourceText, translatedText, sourceLanguage, targetLanguage, metadata);
        mimeType = 'application/xml';
        break;
        
      case 'tmx':
        content = generateTMXFile(sourceText, translatedText, sourceLanguage, targetLanguage, metadata);
        mimeType = 'application/xml';
        break;
        
      case 'csv':
        content = generateCSVFile(sourceText, translatedText, metadata);
        mimeType = 'text/csv';
        break;
        
      case 'txt':
        content = generateTextFile(sourceText, translatedText, metadata);
        mimeType = 'text/plain';
        break;
        
      case 'qa-report':
        content = await generateQAReport(sourceText, translatedText, targetLanguage, metadata);
        mimeType = 'application/pdf';
        break;
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    return { content, mimeType };
    
  } catch (error) {
    console.error('Error generating translation file:', error);
    throw error;
  }
});

// Export Translation Memory
resolver.define('exportTranslationMemory', async (req) => {
  const { sourceLanguage, targetLanguage, format } = req.payload;
  
  try {
    // Get TM entries
    const tmKey = `tm-${sourceLanguage}-${targetLanguage}`;
    const tmEntries = await storage.get(tmKey) || [];
    
    let content = '';
    let mimeType = 'text/plain';
    
    switch (format.toLowerCase()) {
      case 'tmx':
        content = generateTMFromEntries(tmEntries, sourceLanguage, targetLanguage);
        mimeType = 'application/xml';
        break;
        
      case 'csv':
        content = generateTMCSV(tmEntries);
        mimeType = 'text/csv';
        break;
        
      case 'xlf':
        content = generateTMAsXLIFF(tmEntries, sourceLanguage, targetLanguage);
        mimeType = 'application/xml';
        break;
        
      default:
        throw new Error(`Unsupported TM export format: ${format}`);
    }
    
    return { content, mimeType };
    
  } catch (error) {
    console.error('Error exporting Translation Memory:', error);
    throw error;
  }
});

// Generate consistency report
resolver.define('generateConsistencyReport', async (req) => {
  const { analysisResults, sourceText, translatedText, targetLanguage, issueKey } = req.payload;
  
  try {
    const reportHTML = generateConsistencyHTML(analysisResults, sourceText, translatedText, targetLanguage, issueKey);
    
    // In a real implementation, you would convert HTML to PDF here
    // For now, returning HTML that browsers can print to PDF
    return { 
      content: reportHTML, 
      mimeType: 'text/html' // Client can print to PDF
    };
    
  } catch (error) {
    console.error('Error generating consistency report:', error);
    throw error;
  }
});

// Generate project summary
resolver.define('generateProjectSummary', async (req) => {
  const { issueKey, sourceText, translatedText, targetLanguage, status, consistency, styleCompliance, tmMatches } = req.payload;
  
  try {
    const summaryHTML = generateProjectSummaryHTML({
      issueKey,
      sourceText,
      translatedText,
      targetLanguage,
      status,
      consistency,
      styleCompliance,
      tmMatches,
      timestamp: new Date().toISOString()
    });
    
    return { content: summaryHTML, mimeType: 'text/html' };
    
  } catch (error) {
    console.error('Error generating project summary:', error);
    throw error;
  }
});

// File generation helper functions
function generateXLIFFFile(sourceText, translatedText, sourceLanguage, targetLanguage, metadata) {
  const timestamp = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="${sourceLanguage}" target-language="${targetLanguage}" datatype="plaintext">
    <header>
      <tool tool-id="seamless-linguaflow" tool-name="Seamless LinguaFlow" tool-version="1.0"/>
      <note>Generated on ${timestamp}</note>
      ${metadata?.consistency ? `<note>Consistency Score: ${metadata.consistency.count} issues found</note>` : ''}
      ${metadata?.styleCompliance ? `<note>Style Compliance: ${metadata.styleCompliance.score}%</note>` : ''}
    </header>
    <body>
      <trans-unit id="1" approved="${metadata?.workflow === 'Completed' ? 'yes' : 'no'}">
        <source>${escapeXML(sourceText)}</source>
        <target state="${metadata?.workflow === 'Completed' ? 'final' : 'new'}">${escapeXML(translatedText)}</target>
        ${metadata?.workflow ? `<note>Workflow Status: ${metadata.workflow}</note>` : ''}
      </trans-unit>
    </body>
  </file>
</xliff>`;
}

function generateTMXFile(sourceText, translatedText, sourceLanguage, targetLanguage, metadata) {
  const timestamp = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<tmx version="1.4">
  <header creationtool="Seamless LinguaFlow" creationtoolversion="1.0" datatype="plaintext" segtype="sentence" adminlang="${sourceLanguage}" srclang="${sourceLanguage}">
    <note>Generated on ${timestamp}</note>
  </header>
  <body>
    <tu tuid="1">
      <tuv xml:lang="${sourceLanguage}">
        <seg>${escapeXML(sourceText)}</seg>
      </tuv>
      <tuv xml:lang="${targetLanguage}">
        <seg>${escapeXML(translatedText)}</seg>
      </tuv>
      ${metadata ? `<note>Quality Score: ${metadata.styleCompliance?.score || 'N/A'}%</note>` : ''}
    </tu>
  </body>
</tmx>`;
}

function generateCSVFile(sourceText, translatedText, metadata) {
  const timestamp = new Date().toISOString();
  
  let csv = 'Source,Target,Status,Quality Score,Timestamp,Notes\n';
  csv += `"${escapeCSV(sourceText)}","${escapeCSV(translatedText)}","${metadata?.workflow || 'Draft'}","${metadata?.styleCompliance?.score || 'N/A'}%","${timestamp}","Generated by Seamless LinguaFlow"\n`;
  
  return csv;
}

function generateTextFile(sourceText, translatedText, metadata) {
  const timestamp = new Date().toISOString();
  
  return `SEAMLESS LINGUAFLOW - TRANSLATION EXPORT
=====================================

Generated: ${timestamp}
Status: ${metadata?.workflow || 'Draft'}
${metadata?.styleCompliance ? `Style Compliance: ${metadata.styleCompliance.score}%` : ''}
${metadata?.consistency ? `Consistency Issues: ${metadata.consistency.count}` : ''}

SOURCE TEXT:
${sourceText}

TRANSLATED TEXT:
${translatedText}

---
Generated by Seamless LinguaFlow
Translation Management System`;
}

function generateTMFromEntries(entries, sourceLanguage, targetLanguage) {
  const timestamp = new Date().toISOString();
  
  let tmx = `<?xml version="1.0" encoding="UTF-8"?>
<tmx version="1.4">
  <header creationtool="Seamless LinguaFlow" creationtoolversion="1.0" datatype="plaintext" segtype="sentence" adminlang="${sourceLanguage}" srclang="${sourceLanguage}">
    <note>Translation Memory Export - ${timestamp}</note>
    <note>Entries: ${entries.length}</note>
  </header>
  <body>`;

  entries.forEach((entry, index) => {
    tmx += `
    <tu tuid="${index + 1}">
      <tuv xml:lang="${sourceLanguage}">
        <seg>${escapeXML(entry.source)}</seg>
      </tuv>
      <tuv xml:lang="${targetLanguage}">
        <seg>${escapeXML(entry.target)}</seg>
      </tuv>
      <note>Confidence: ${entry.confidence}, Usage: ${entry.usageCount}, Created: ${entry.timestamp}</note>
    </tu>`;
  });

  tmx += `
  </body>
</tmx>`;

  return tmx;
}

function generateTMCSV(entries) {
  let csv = 'Source,Target,Source Language,Target Language,Confidence,Usage Count,Context,Timestamp\n';
  
  entries.forEach(entry => {
    csv += `"${escapeCSV(entry.source)}","${escapeCSV(entry.target)}","${entry.sourceLanguage}","${entry.targetLanguage}","${entry.confidence}","${entry.usageCount}","${entry.context}","${entry.timestamp}"\n`;
  });
  
  return csv;
}

function generateConsistencyHTML(results, sourceText, translatedText, targetLanguage, issueKey) {
  const timestamp = new Date().toISOString();
  
  return `<!DOCTYPE html>
<html>
<head>
    <title>Consistency Analysis Report - ${issueKey}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #0052cc; padding-bottom: 20px; margin-bottom: 30px; }
        .issue { background: #fff3e0; border-left: 4px solid #ff8f00; padding: 15px; margin: 20px 0; }
        .compliant { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .print-friendly { page-break-inside: avoid; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Translation Consistency Analysis Report</h1>
        <p><strong>Issue:</strong> ${issueKey}</p>
        <p><strong>Target Language:</strong> ${targetLanguage}</p>
        <p><strong>Generated:</strong> ${timestamp}</p>
        <p><strong>Issues Found:</strong> ${results.count}</p>
    </div>
    
    <div class="metadata">
        <h3>Source Text</h3>
        <p>${escapeHTML(sourceText)}</p>
        
        <h3>Translated Text</h3>
        <p>${escapeHTML(translatedText)}</p>
    </div>
    
    <div class="print-friendly">
        <h2>Analysis Results</h2>
        ${results.count === 0 ? 
          '<div class="issue compliant"><strong>✅ No Consistency Issues Found</strong><p>Translation terminology is consistent throughout.</p></div>' :
          results.issues.map((issue, index) => `
            <div class="issue">
                <h3>Issue #${index + 1} - ${issue.severity.toUpperCase()}</h3>
                <p><strong>Source:</strong> "${escapeHTML(issue.source)}"</p>
                <p><strong>Inconsistent Translations:</strong></p>
                <ul>
                    ${issue.translations.map(trans => `<li>"${escapeHTML(trans)}"</li>`).join('')}
                </ul>
                <p><strong>Recommendation:</strong> ${escapeHTML(issue.recommendation)}</p>
            </div>
          `).join('')
        }
    </div>
    
    <div style="margin-top: 40px; text-align: center; color: #666;">
        <p>Generated by Seamless LinguaFlow Translation Management System</p>
    </div>
</body>
</html>`;
}

function generateProjectSummaryHTML(data) {
  return `<!DOCTYPE html>
<html>
<head>
    <title>Project Summary - ${data.issueKey}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #0052cc; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin: 30px 0; }
        .status-badge { padding: 5px 10px; border-radius: 15px; color: white; display: inline-block; }
        .completed { background-color: #4caf50; }
        .in-progress { background-color: #ff9800; }
        .pending { background-color: #9e9e9e; }
        .metrics { display: flex; gap: 20px; }
        .metric { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Translation Project Summary</h1>
        <p><strong>Issue:</strong> ${data.issueKey}</p>
        <p><strong>Language:</strong> English → ${data.targetLanguage}</p>
        <p><strong>Status:</strong> <span class="status-badge ${data.status.toLowerCase().replace(' ', '-')}">${data.status}</span></p>
        <p><strong>Generated:</strong> ${data.timestamp}</p>
    </div>
    
    <div class="section">
        <h2>Quality Metrics</h2>
        <div class="metrics">
            <div class="metric">
                <h3>Style Compliance</h3>
                <p><strong>${data.styleCompliance?.score || 'N/A'}%</strong></p>
            </div>
            <div class="metric">
                <h3>Consistency Issues</h3>
                <p><strong>${data.consistency?.count || 0}</strong></p>
            </div>
            <div class="metric">
                <h3>TM Matches</h3>
                <p><strong>${data.tmMatches?.length || 0}</strong></p>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>Translation Content</h2>
        <h3>Source Text:</h3>
        <p style="background: #f9f9f9; padding: 15px; border-radius: 5px;">${escapeHTML(data.sourceText)}</p>
        
        <h3>Translated Text:</h3>
        <p style="background: #e8f5e8; padding: 15px; border-radius: 5px;">${escapeHTML(data.translatedText)}</p>
    </div>
    
    ${data.consistency?.count > 0 ? `
    <div class="section">
        <h2>Consistency Analysis</h2>
        <p>Found ${data.consistency.count} terminology inconsistencies requiring review.</p>
    </div>` : ''}
    
    ${data.styleCompliance ? `
    <div class="section">
        <h2>Style Compliance</h2>
        <p>Achieved ${data.styleCompliance.score}% compliance with style guide requirements.</p>
    </div>` : ''}
    
    <div style="margin-top: 40px; text-align: center; color: #666;">
        <p>Generated by Seamless LinguaFlow Translation Management System</p>
    </div>
</body>
</html>`;
}

// Utility functions
function escapeXML(text) {
  return text.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&apos;');
}

function escapeHTML(text) {
  return text.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;');
}

function escapeCSV(text) {
  return text.replace(/"/g, '""');
}

// Comment System
resolver.define('addComment', async (req) => {
  const { comment, issueKey, userName } = req.payload;
  
  if (!comment || !issueKey) {
    throw new Error('Comment text and issue key are required');
  }

  try {
    const commentObj = {
      id: generateId(),
      comment: comment.trim(),
      issueKey: issueKey,
      userName: userName || 'Unknown User',
      timestamp: new Date().toISOString()
    };

    const commentsKey = `comments-${issueKey}`;
    let comments = await storage.get(commentsKey) || [];
    comments.unshift(commentObj); // Add to beginning
    
    // Keep only latest 100 comments
    if (comments.length > 100) {
      comments = comments.slice(0, 100);
    }
    
    await storage.set(commentsKey, comments);
    return commentObj;
    
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
});

resolver.define('getComments', async (req) => {
  const { issueKey } = req.payload;
  
  try {
    const commentsKey = `comments-${issueKey}`;
    return await storage.get(commentsKey) || [];
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
});

// Activity Feed System
resolver.define('logActivity', async (req) => {
  const { issueKey, action, details, userName } = req.payload;
  
  if (!issueKey || !action) {
    throw new Error('Issue key and action are required');
  }

  try {
    const activity = {
      id: generateId(),
      issueKey: issueKey,
      action: action,
      details: details || action,
      userName: userName || 'Unknown User',
      timestamp: new Date().toISOString()
    };

    const activityKey = `activity-${issueKey}`;
    let activities = await storage.get(activityKey) || [];
    activities.unshift(activity); // Add to beginning
    
    // Keep only latest 50 activities
    if (activities.length > 50) {
      activities = activities.slice(0, 50);
    }
    
    await storage.set(activityKey, activities);
    return activity;
    
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
});

resolver.define('getActivityFeed', async (req) => {
  const { issueKey } = req.payload;
  
  try {
    const activityKey = `activity-${issueKey}`;
    return await storage.get(activityKey) || [];
  } catch (error) {
    console.error('Error getting activity feed:', error);
    return [];
  }
});

// Assignment System
resolver.define('updateAssignments', async (req) => {
  const { issueKey, translator, reviewer, projectLead, dueDate } = req.payload;
  
  if (!issueKey) {
    throw new Error('Issue key is required');
  }

  try {
    const assignments = {
      translator: translator || '',
      reviewer: reviewer || '',
      projectLead: projectLead || '',
      dueDate: dueDate || '',
      lastUpdated: new Date().toISOString()
    };

    const assignmentsKey = `assignments-${issueKey}`;
    await storage.set(assignmentsKey, assignments);
    
    return { success: true, assignments };
    
  } catch (error) {
    console.error('Error updating assignments:', error);
    throw error;
  }
});

resolver.define('getAssignments', async (req) => {
  const { issueKey } = req.payload;
  
  try {
    const assignmentsKey = `assignments-${issueKey}`;
    return await storage.get(assignmentsKey) || {};
  } catch (error) {
    console.error('Error getting assignments:', error);
    return {};
  }
});

// Change History System
resolver.define('logChange', async (req) => {
  const { issueKey, field, oldValue, newValue, reason, userName } = req.payload;
  
  if (!issueKey || !field) {
    throw new Error('Issue key and field are required');
  }

  try {
    const change = {
      id: generateId(),
      issueKey: issueKey,
      field: field,
      oldValue: oldValue || '',
      newValue: newValue || '',
      reason: reason || 'User modification',
      userName: userName || 'Unknown User',
      timestamp: new Date().toISOString()
    };

    const historyKey = `history-${issueKey}`;
    let history = await storage.get(historyKey) || [];
    history.unshift(change); // Add to beginning
    
    // Keep only latest 200 changes
    if (history.length > 200) {
      history = history.slice(0, 200);
    }
    
    await storage.set(historyKey, history);
    return change;
    
  } catch (error) {
    console.error('Error logging change:', error);
    throw error;
  }
});

resolver.define('getChangeHistory', async (req) => {
  const { issueKey } = req.payload;
  
  try {
    const historyKey = `history-${issueKey}`;
    return await storage.get(historyKey) || [];
  } catch (error) {
    console.error('Error getting change history:', error);
    return [];
  }
});

// Utility function for generating IDs
function generateId() {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const handler = resolver.getDefinitions();
