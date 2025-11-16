import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Button, Box, useProductContext, TextArea, Select, Checkbox } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [status, setStatus] = useState('Loading...');
  const [textToCheck, setTextToCheck] = useState('');
  const [qualityFeedback, setQualityFeedback] = useState('');
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);
  const [translationResult, setTranslationResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [currentWorkflow, setCurrentWorkflow] = useState('quality-first'); // 'quality-first' or 'translate-first'
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [consistencyReport, setConsistencyReport] = useState('');
  const [isAnalyzingConsistency, setIsAnalyzingConsistency] = useState(false);
  const [enableConsistencyCheck, setEnableConsistencyCheck] = useState(true);
  const [consistencyResults, setConsistencyResults] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [spellingErrors, setSpellingErrors] = useState([]);
  const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);
  const [enableRealTimeSpelling, setEnableRealTimeSpelling] = useState(true);
  const [showSpellingSuggestions, setShowSpellingSuggestions] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [tmMatches, setTmMatches] = useState([]);
  const [isSearchingTM, setIsSearchingTM] = useState(false);
  const [showTMBrowser, setShowTMBrowser] = useState(false);
  const [tmBrowseResults, setTmBrowseResults] = useState([]);
  const [styleGuideEnabled, setStyleGuideEnabled] = useState(false);
  const [styleGuideFile, setStyleGuideFile] = useState(null);
  const [styleGuideContent, setStyleGuideContent] = useState('');
  const [isUploadingStyleGuide, setIsUploadingStyleGuide] = useState(false);
  const [styleComplianceResults, setStyleComplianceResults] = useState(null);
  const [isCheckingStyleCompliance, setIsCheckingStyleCompliance] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [activityFeed, setActivityFeed] = useState([]);
  const [assignedTranslator, setAssignedTranslator] = useState('');
  const [assignedReviewer, setAssignedReviewer] = useState('');
  const [projectLead, setProjectLead] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [changeHistory, setChangeHistory] = useState([]);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileProcessingResult, setFileProcessingResult] = useState('');
  const context = useProductContext();
  const issueKey = context?.platformContext?.issueKey;

  // Translation workflow stages
  const workflowStages = ['Pending', 'In Progress', 'Review', 'Revision', 'Completed'];

  useEffect(() => {
    if (issueKey) {
      // Load saved status, preferences, and collaboration data for this specific issue
      Promise.all([
        invoke('getTranslationStatus', { issueKey }),
        invoke('getProjectPreferences', { issueKey }),
        invoke('getComments', { issueKey }),
        invoke('getActivityFeed', { issueKey }),
        invoke('getAssignments', { issueKey }),
        invoke('getChangeHistory', { issueKey })
      ])
        .then(([savedStatus, savedPreferences, savedComments, savedActivity, savedAssignments, savedHistory]) => {
          setStatus(savedStatus || 'Pending');
          
          // Load saved preferences
          if (savedPreferences) {
            setEnableConsistencyCheck(savedPreferences.enableConsistencyCheck !== false);
            setCurrentWorkflow(savedPreferences.workflow || 'quality-first');
            setTargetLanguage(savedPreferences.targetLanguage || 'Spanish');
            setStyleGuideEnabled(savedPreferences.styleGuideEnabled || false);
            setStyleGuideContent(savedPreferences.styleGuideContent || '');
          }
          
          // Load collaboration data
          setComments(savedComments || []);
          setActivityFeed(savedActivity || []);
          
          if (savedAssignments) {
            setAssignedTranslator(savedAssignments.translator || '');
            setAssignedReviewer(savedAssignments.reviewer || '');
            setProjectLead(savedAssignments.projectLead || '');
            setDueDate(savedAssignments.dueDate || '');
          }
          
          setChangeHistory(savedHistory || []);
        })
        .catch(error => {
          console.error('Error loading status and preferences:', error);
          setStatus('Pending');
        });
    }
  }, [issueKey]);

  const advanceWorkflow = async () => {
    const currentIndex = workflowStages.indexOf(status);
    if (currentIndex < workflowStages.length - 1) {
      const nextStatus = workflowStages[currentIndex + 1];
      
      try {
        // Save new status and current preferences to Forge storage
        await Promise.all([
          invoke('saveTranslationStatus', { issueKey, status: nextStatus }),
          invoke('saveProjectPreferences', { 
            issueKey, 
            preferences: {
              enableConsistencyCheck,
              workflow: currentWorkflow,
              targetLanguage,
              styleGuideEnabled,
              styleGuideContent
            }
          })
        ]);
        setStatus(nextStatus);
      } catch (error) {
        console.error('Error saving status and preferences:', error);
      }
    }
  };

  const canAdvance = status !== 'Completed' && workflowStages.indexOf(status) < workflowStages.length - 1;

  const handleQualityCheck = async () => {
    if (!textToCheck.trim()) {
      setQualityFeedback('Please enter some text to check.');
      return;
    }

    setIsCheckingQuality(true);
    setQualityFeedback('');

    try {
      const feedback = await invoke('text-checker', { text: textToCheck });
      setQualityFeedback(feedback);
      
      // Also run spell check if enabled
      if (enableRealTimeSpelling) {
        await checkSpelling(textToCheck);
      }
    } catch (error) {
      console.error('Error checking text quality:', error);
      setQualityFeedback('Error: Unable to check text quality. Please try again.');
    } finally {
      setIsCheckingQuality(false);
    }
  };

  // Real-time spelling checker
  const checkSpelling = async (text) => {
    if (!text.trim() || !enableRealTimeSpelling) return;

    setIsCheckingSpelling(true);
    try {
      const result = await invoke('spellChecker', { text: text });
      setSpellingErrors(result.errors || []);
    } catch (error) {
      console.error('Spelling check error:', error);
      setSpellingErrors([]);
    } finally {
      setIsCheckingSpelling(false);
    }
  };

  // Debounced spell checking for real-time feedback
  const debouncedSpellCheck = React.useCallback(
    debounce((text) => checkSpelling(text), 1000),
    [enableRealTimeSpelling]
  );

  // Handle text change with real-time spell checking and TM search
  const handleTextChange = (newText) => {
    setTextToCheck(newText);
    if (enableRealTimeSpelling) {
      debouncedSpellCheck(newText);
    }
    // Search TM for matches
    debouncedTMSearch(newText);
  };

  // Search Translation Memory for matches
  const searchTM = async (text) => {
    if (!text.trim() || text.length < 10) {
      setTmMatches([]);
      return;
    }

    setIsSearchingTM(true);
    try {
      const result = await invoke('searchTM', {
        source: text,
        sourceLanguage: 'en',
        targetLanguage: targetLanguage,
        fuzzyMatch: true
      });
      setTmMatches(result.matches || []);
    } catch (error) {
      console.error('TM search error:', error);
      setTmMatches([]);
    } finally {
      setIsSearchingTM(false);
    }
  };

  // Debounced TM search
  const debouncedTMSearch = React.useCallback(
    debounce((text) => searchTM(text), 800),
    [targetLanguage]
  );

  // Apply spelling suggestion
  const applySpellingSuggestion = (errorIndex, suggestion) => {
    const error = spellingErrors[errorIndex];
    if (!error) return;

    const newText = textToCheck.substring(0, error.start) + 
                   suggestion + 
                   textToCheck.substring(error.end);
    
    setTextToCheck(newText);
    
    // Update error positions after replacement
    const updatedErrors = spellingErrors.filter((_, index) => index !== errorIndex);
    setSpellingErrors(updatedErrors);
    
    // Re-run spell check after a short delay
    setTimeout(() => checkSpelling(newText), 500);
  };

  // Highlight text with spelling errors
  const getHighlightedText = (text) => {
    if (!enableRealTimeSpelling || spellingErrors.length === 0) {
      return text;
    }

    let highlightedText = text;
    let offset = 0;

    // Sort errors by position to apply highlights correctly
    const sortedErrors = [...spellingErrors].sort((a, b) => a.start - b.start);

    sortedErrors.forEach((error, index) => {
      const start = error.start + offset;
      const end = error.end + offset;
      const errorWord = highlightedText.substring(start, end);
      
      const highlightedWord = `<span class="spelling-error" data-error-index="${index}" style="background-color: #ffebee; border-bottom: 2px wavy #d32f2f; cursor: pointer;">${errorWord}</span>`;
      
      highlightedText = highlightedText.substring(0, start) + 
                       highlightedWord + 
                       highlightedText.substring(end);
      
      offset += highlightedWord.length - errorWord.length;
    });

    return highlightedText;
  };

  // Simple debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const handleAITranslation = async () => {
    if (!textToCheck.trim()) {
      setTranslationResult('Please enter some text to translate.');
      return;
    }

    setIsTranslating(true);
    setTranslationResult('');

    try {
      // Check if we have exact TM match first
      const exactMatch = tmMatches.find(match => match.matchScore === 100);
      if (exactMatch) {
        setTranslationResult(`🔄 **Translation Memory Match (100%)**\n\n${exactMatch.target}\n\n*Previously translated and saved in Translation Memory*`);
        
        // Still save usage to TM
        await invoke('saveToTM', {
          source: textToCheck,
          target: exactMatch.target,
          sourceLanguage: 'en',
          targetLanguage: targetLanguage,
          context: 'tm-reuse',
          confidence: exactMatch.confidence
        });
      } else {
        // Use AI translation
        const result = await invoke('ai-translator', { 
          text: textToCheck, 
          targetLanguage: targetLanguage 
        });
        setTranslationResult(result);
        
        // Check style compliance for AI translation
        if (styleGuideEnabled) {
          await checkStyleCompliance(result);
        }
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationResult('Error: Unable to translate text. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Apply TM suggestion
  const applyTMSuggestion = async (match) => {
    setTranslationResult(`🔄 **Applied Translation Memory Match (${match.matchScore}%)**\n\n${match.target}\n\n*Source: ${match.context} | Confidence: ${match.confidence}*`);
    
    // Save usage to TM
    try {
      await invoke('saveToTM', {
        source: textToCheck,
        target: match.target,
        sourceLanguage: 'en',
        targetLanguage: targetLanguage,
        context: 'tm-reuse',
        confidence: match.confidence
      });
    } catch (error) {
      console.error('Error saving TM usage:', error);
    }
    
    // Check style compliance for TM suggestion
    if (styleGuideEnabled) {
      await checkStyleCompliance(match.target);
    }
  };

  // Browse Translation Memory
  const browseTM = async () => {
    setShowTMBrowser(true);
    try {
      const result = await invoke('searchTM', {
        source: '',
        sourceLanguage: 'en',
        targetLanguage: targetLanguage,
        fuzzyMatch: false
      });
      setTmBrowseResults(result.matches || []);
    } catch (error) {
      console.error('TM browse error:', error);
      setTmBrowseResults([]);
    }
  };

  // Handle style guide upload
  const handleStyleGuideUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setStyleGuideFile(file);
    setIsUploadingStyleGuide(true);

    try {
      const fileContent = await readFileAsText(file);
      setStyleGuideContent(fileContent);
      
      // Save style guide to preferences
      if (issueKey) {
        await invoke('saveProjectPreferences', { 
          issueKey, 
          preferences: {
            enableConsistencyCheck,
            workflow: currentWorkflow,
            targetLanguage,
            styleGuideEnabled: true,
            styleGuideContent: fileContent
          }
        });
      }
      
      setStyleGuideEnabled(true);
      alert('Style guide uploaded successfully! Translation compliance checking is now enabled.');
      
    } catch (error) {
      console.error('Style guide upload error:', error);
      alert('Error uploading style guide. Please try again.');
    } finally {
      setIsUploadingStyleGuide(false);
    }
  };

  // Read file as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Check style compliance
  const checkStyleCompliance = async (textToCheck) => {
    if (!textToCheck.trim() || !styleGuideEnabled || !styleGuideContent.trim()) {
      return null;
    }

    setIsCheckingStyleCompliance(true);
    try {
      const result = await invoke('checkStyleCompliance', {
        translatedText: textToCheck,
        styleGuideContent: styleGuideContent,
        targetLanguage: targetLanguage
      });
      setStyleComplianceResults(result);
      return result;
    } catch (error) {
      console.error('Style compliance check error:', error);
      setStyleComplianceResults(null);
      return null;
    } finally {
      setIsCheckingStyleCompliance(false);
    }
  };

  // Remove style guide
  const removeStyleGuide = async () => {
    setStyleGuideFile(null);
    setStyleGuideContent('');
    setStyleGuideEnabled(false);
    setStyleComplianceResults(null);
    
    // Update preferences
    if (issueKey) {
      await invoke('saveProjectPreferences', { 
        issueKey, 
        preferences: {
          enableConsistencyCheck,
          workflow: currentWorkflow,
          targetLanguage,
          styleGuideEnabled: false,
          styleGuideContent: ''
        }
      });
    }
    
    // Clear file input
    const fileInput = document.getElementById('styleGuideUpload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Download functions
  const downloadFile = (content, filename, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateTimestamp = () => {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  };

  // Export finished translation file
  const exportTranslationFile = async (format) => {
    if (!translationResult.trim() && !textToCheck.trim()) {
      alert('No translation content to export.');
      return;
    }

    setIsExporting(true);
    try {
      const result = await invoke('generateTranslationFile', {
        sourceText: textToCheck,
        translatedText: translationResult || textToCheck,
        sourceLanguage: 'en',
        targetLanguage: targetLanguage,
        format: format,
        issueKey: issueKey,
        metadata: {
          timestamp: new Date().toISOString(),
          consistency: consistencyResults,
          styleCompliance: styleComplianceResults,
          workflow: status
        }
      });

      const timestamp = generateTimestamp();
      const filename = `translation-${targetLanguage}-${timestamp}.${format}`;
      downloadFile(result.content, filename, result.mimeType);

    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export consistency report
  const exportConsistencyReport = async () => {
    if (!consistencyResults) {
      alert('No consistency analysis available to export.');
      return;
    }

    setIsExporting(true);
    try {
      const result = await invoke('generateConsistencyReport', {
        analysisResults: consistencyResults,
        sourceText: sourceText,
        translatedText: translatedText,
        targetLanguage: targetLanguage,
        issueKey: issueKey
      });

      const timestamp = generateTimestamp();
      const filename = `consistency-report-${timestamp}.pdf`;
      downloadFile(result.content, filename, 'application/pdf');

    } catch (error) {
      console.error('Report export error:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Translation Memory
  const exportTM = async (format) => {
    setIsExporting(true);
    try {
      const result = await invoke('exportTranslationMemory', {
        sourceLanguage: 'en',
        targetLanguage: targetLanguage,
        format: format
      });

      const timestamp = generateTimestamp();
      const filename = `translation-memory-${targetLanguage}-${timestamp}.${format}`;
      downloadFile(result.content, filename, result.mimeType);

    } catch (error) {
      console.error('TM export error:', error);
      alert('Error exporting Translation Memory. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export project summary
  const exportProjectSummary = async () => {
    setIsExporting(true);
    try {
      const result = await invoke('generateProjectSummary', {
        issueKey: issueKey,
        sourceText: textToCheck,
        translatedText: translationResult,
        targetLanguage: targetLanguage,
        status: status,
        consistency: consistencyResults,
        styleCompliance: styleComplianceResults,
        tmMatches: tmMatches
      });

      const timestamp = generateTimestamp();
      const filename = `project-summary-${issueKey}-${timestamp}.html`;
      downloadFile(result.content, filename, 'text/html');

    } catch (error) {
      console.error('Project summary export error:', error);
      alert('Error generating project summary. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleConsistencyAnalysis = async () => {
    if (!sourceText.trim() || !translatedText.trim()) {
      setConsistencyReport('Please provide both source text and translated text for analysis.');
      return;
    }

    if (!enableConsistencyCheck) {
      setConsistencyReport('✨ **Consistency Checking Disabled**\n\nVariation in translation is allowed. This is ideal for creative content, marketing copy, or when natural language flow is prioritized over strict terminology consistency.');
      setConsistencyResults(null);
      return;
    }

    setIsAnalyzingConsistency(true);
    setConsistencyReport('');
    setConsistencyResults(null);
    setAnalysisProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + 20, 90));
    }, 200);

    try {
      const result = await invoke('analyzeAutoConsistency', {
        sourceText: sourceText,
        translatedText: translatedText,
        targetLanguage: targetLanguage
      });
      
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      
      // Parse the result for enhanced display
      const parsedResults = parseConsistencyResults(result);
      setConsistencyResults(parsedResults);
      setConsistencyReport(result);
      
    } catch (error) {
      clearInterval(progressInterval);
      setAnalysisProgress(0);
      console.error('Consistency analysis error:', error);
      setConsistencyReport('Error: Unable to analyze consistency. Please try again.');
      setConsistencyResults(null);
    } finally {
      setTimeout(() => {
        setIsAnalyzingConsistency(false);
        setAnalysisProgress(0);
      }, 500);
    }
  };

  // Parse consistency results for enhanced UI
  const parseConsistencyResults = (report) => {
    if (!report || report.includes('No repeated segments found')) {
      return { type: 'no_issues', count: 0, issues: [] };
    }

    if (report.includes('Consistency Checking Disabled')) {
      return { type: 'disabled', count: 0, issues: [] };
    }

    // Extract issue count from report
    const countMatch = report.match(/Found (\d+) repeated segment/);
    const issueCount = countMatch ? parseInt(countMatch[1]) : 0;

    // Parse individual issues (simplified parsing)
    const issues = [];
    const segments = report.split('• **Source**:').slice(1);
    
    segments.forEach((segment, index) => {
      const lines = segment.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length >= 3) {
        issues.push({
          id: index,
          source: lines[0].replace(/['"]/g, ''),
          translations: extractTranslations(segment),
          recommendation: extractRecommendation(segment),
          severity: determineSeverity(segment)
        });
      }
    });

    return {
      type: 'issues_found',
      count: issueCount,
      issues: issues
    };
  };

  const extractTranslations = (segment) => {
    const translationMatches = segment.match(/- \*\*Translation \d+\*\*: "([^"]+)"/g) || [];
    return translationMatches.map(match => match.replace(/- \*\*Translation \d+\*\*: "([^"]+)"/, '$1'));
  };

  const extractRecommendation = (segment) => {
    const recMatch = segment.match(/\*\*Recommendation\*\*: ([^\n]+)/);
    return recMatch ? recMatch[1] : 'Review for consistency';
  };

  const determineSeverity = (segment) => {
    const text = segment.toLowerCase();
    if (text.includes('critical') || text.includes('error') || text.includes('incorrect')) {
      return 'high';
    } else if (text.includes('recommend') || text.includes('should')) {
      return 'medium';
    }
    return 'low';
  };

  const applySuggestion = (issueId, suggestedText) => {
    // Find and replace in the translated text
    const issue = consistencyResults.issues[issueId];
    if (!issue) return;

    // Simple replacement of first occurrence of inconsistent translation
    let updatedText = translatedText;
    issue.translations.forEach(translation => {
      updatedText = updatedText.replace(translation, suggestedText);
    });
    
    setTranslatedText(updatedText);
    
    // Update the issue as resolved
    const updatedResults = { ...consistencyResults };
    updatedResults.issues[issueId].resolved = true;
    setConsistencyResults(updatedResults);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setFileProcessing(true);
    setFileProcessingResult('');

    try {
      // Convert file to base64 for transmission
      const fileContent = await readFileAsBase64(file);
      
      const result = await invoke('processTranslationFile', {
        fileName: file.name,
        fileContent: fileContent,
        fileType: file.type,
        targetLanguage: targetLanguage,
        enableConsistencyCheck: enableConsistencyCheck
      });

      setFileProcessingResult(result);

      // If the file contains source and target text, populate the consistency analyzer
      if (result.sourceText && result.targetText) {
        setSourceText(result.sourceText);
        setTranslatedText(result.targetText);
      }

    } catch (error) {
      console.error('File processing error:', error);
      setFileProcessingResult('Error: Unable to process file. Please ensure it\'s a valid translation file format.');
    } finally {
      setFileProcessing(false);
    }
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // Remove data:mime;base64, prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const clearFile = () => {
    setUploadedFile(null);
    setFileProcessingResult('');
    if (document.getElementById('fileUpload')) {
      document.getElementById('fileUpload').value = '';
    }
  };

  return (
    <Box padding="space.200">
      <Text size="large">Seamless LinguaFlow</Text>
      <Box paddingTop="space.100">
        <Text>Current Translation Status: <strong>{status}</strong></Text>
      </Box>
      {issueKey && (
        <Box paddingTop="space.100">
          <Text size="small">Issue: {issueKey}</Text>
        </Box>
      )}
      <Box paddingTop="space.200">
        <Button 
          appearance="primary" 
          onClick={advanceWorkflow}
          isDisabled={!canAdvance}
        >
          {canAdvance ? 'Advance to Next Stage' : 'Workflow Complete'}
        </Button>
      </Box>
      
      <Box paddingTop="space.300">
        <Text size="medium">AI Quality Check</Text>
        
        {/* Spelling Options */}
        <Box paddingTop="space.100">
          <Checkbox
            name="enableRealTimeSpelling"
            value="enableRealTimeSpelling"
            label="Enable real-time spelling check"
            isChecked={enableRealTimeSpelling}
            onChange={(isChecked) => {
              setEnableRealTimeSpelling(isChecked);
              if (isChecked && textToCheck.trim()) {
                checkSpelling(textToCheck);
              } else {
                setSpellingErrors([]);
              }
            }}
          />
          <Box paddingTop="space.050">
            <Text size="small" color="color.text.subtle">
              {enableRealTimeSpelling 
                ? "Spelling errors will be highlighted as you type" 
                : "Manual spell checking only"}
            </Text>
          </Box>
        </Box>

        <Box paddingTop="space.150">
          <Text size="small" weight="semibold">
            Text to Check
            {isCheckingSpelling && <span style={{ marginLeft: '8px', color: '#0052cc' }}>🔍 Checking spelling...</span>}
            {spellingErrors.length > 0 && (
              <span style={{ 
                marginLeft: '8px', 
                backgroundColor: '#d32f2f', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '10px' 
              }}>
                {spellingErrors.length} spelling issue{spellingErrors.length !== 1 ? 's' : ''}
              </span>
            )}
          </Text>
          <Box paddingTop="space.050">
            <TextArea
              placeholder="Enter text to check for grammatical errors, awkward phrasing, and clarity..."
              value={textToCheck}
              onChange={(e) => handleTextToCheckChange(e.target.value)}
              rows={6}
              spellCheck={!enableRealTimeSpelling} // Use browser spell check when our real-time is disabled
            />
          </Box>
          
          {/* Spelling Error Preview */}
          {enableRealTimeSpelling && textToCheck.trim() && (
            <Box paddingTop="space.100" xcss={{
              padding: 'space.150',
              backgroundColor: 'color.background.neutral.subtle',
              borderRadius: 'border.radius.100',
              border: '1px solid var(--ds-border-neutral)',
              fontSize: '14px',
              lineHeight: '1.4'
            }}>
              <Text size="small" weight="semibold">Preview with Spelling Highlights:</Text>
              <Box paddingTop="space.050">
                <div 
                  dangerouslySetInnerHTML={{ __html: getHighlightedText(textToCheck) }}
                  onClick={(e) => {
                    const errorElement = e.target.closest('.spelling-error');
                    if (errorElement) {
                      const errorIndex = parseInt(errorElement.getAttribute('data-error-index'));
                      setSelectedError(errorIndex);
                      setShowSpellingSuggestions(true);
                    }
                  }}
                />
              </Box>
            </Box>
          )}
          
          {/* Quick Spelling Fixes */}
          {spellingErrors.length > 0 && (
            <Box paddingTop="space.150">
              <Text size="small" weight="semibold">Quick Spelling Fixes:</Text>
              {spellingErrors.slice(0, 5).map((error, index) => (
                <Box key={index} paddingTop="space.100" xcss={{
                  padding: 'space.100',
                  backgroundColor: '#fff3e0',
                  border: '1px solid #ff8f00',
                  borderRadius: 'border.radius.050',
                  borderLeft: '4px solid #ff8f00'
                }}>
                  <Text size="small">
                    <strong>"{error.word}"</strong> at position {error.start}
                  </Text>
                  <Box paddingTop="space.050" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {error.suggestions?.slice(0, 3).map((suggestion, sIndex) => (
                      <Button
                        key={sIndex}
                        appearance="subtle"
                        spacing="compact"
                        onClick={() => applySpellingSuggestion(index, suggestion)}
                        style={{ 
                          fontSize: '11px', 
                          padding: '2px 8px',
                          backgroundColor: '#e8f5e8',
                          border: '1px solid #4caf50'
                        }}
                      >
                        {suggestion}
                      </Button>
                    )) || <Text size="small" color="color.text.subtle">No suggestions available</Text>}
                  </Box>
                </Box>
              ))}
              
              {spellingErrors.length > 5 && (
                <Box paddingTop="space.050">
                  <Text size="small" color="color.text.subtle">
                    ... and {spellingErrors.length - 5} more spelling issue{spellingErrors.length - 5 !== 1 ? 's' : ''}
                  </Text>
                </Box>
              )}
            </Box>
          )}
        </Box>
        <Box paddingTop="space.150" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button 
            appearance="primary" 
            onClick={handleQualityCheck}
            isDisabled={isCheckingQuality || !textToCheck.trim()}
          >
            {isCheckingQuality ? 'Checking...' : 'Run AI Quality Check'}
          </Button>
          
          <Button 
            appearance="subtle" 
            onClick={browseTM}
          >
            📚 Browse Translation Memory
          </Button>
          
          <Button 
            appearance="subtle" 
            onClick={() => checkStyleCompliance(textToCheck)}
            isDisabled={!styleGuideEnabled || !textToCheck.trim() || isCheckingStyleCompliance}
          >
            {isCheckingStyleCompliance ? 'Checking Style...' : '📋 Check Style Compliance'}
          </Button>
          
          <Button 
            appearance="warning"
            onClick={() => setShowExportMenu(!showExportMenu)}
            isDisabled={isExporting}
          >
            {isExporting ? 'Exporting...' : '💾 Export & Download'}
          </Button>
        </Box>
        
        {qualityFeedback && (
          <Box paddingTop="space.200" xcss={{
            padding: 'space.150',
            backgroundColor: 'color.background.neutral.subtle',
            borderRadius: 'border.radius.100',
            border: '1px solid var(--ds-border-neutral)'
          }}>
            <Text size="small" weight="semibold">Quality Check Results:</Text>
            <Box paddingTop="space.100">
              <Text style={{ whiteSpace: 'pre-wrap' }}>{qualityFeedback}</Text>
            </Box>
          </Box>
        )}
        
        {/* Style Guide Section */}
        <Box paddingTop="space.300">
          <Text size="medium">📋 Style Guide Compliance</Text>
          <Box paddingTop="space.100">
            <Text size="small">Upload your organization's style guide to ensure translations follow company standards</Text>
          </Box>
          
          <Box paddingTop="space.150">
            <Checkbox
              name="styleGuideEnabled"
              value="styleGuideEnabled"
              label="Enable style guide compliance checking"
              isChecked={styleGuideEnabled}
              onChange={(isChecked) => {
                setStyleGuideEnabled(isChecked);
                if (!isChecked) {
                  removeStyleGuide();
                }
              }}
            />
          </Box>
          
          {styleGuideEnabled && (
            <Box paddingTop="space.150">
              {!styleGuideContent ? (
                <Box>
                  <Text size="small" weight="semibold">Upload Style Guide:</Text>
                  <Box paddingTop="space.100">
                    <Text size="small" color="color.text.subtle">
                      Supported formats: .txt, .pdf, .doc, .docx, .md
                    </Text>
                  </Box>
                  <Box paddingTop="space.100">
                    <input
                      id="styleGuideUpload"
                      type="file"
                      accept=".txt,.pdf,.doc,.docx,.md"
                      onChange={handleStyleGuideUpload}
                      disabled={isUploadingStyleGuide}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                  </Box>
                  {isUploadingStyleGuide && (
                    <Box paddingTop="space.100">
                      <Text size="small">🔄 Uploading and processing style guide...</Text>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box xcss={{
                  padding: 'space.150',
                  backgroundColor: '#e8f5e8',
                  border: '1px solid #4caf50',
                  borderRadius: 'border.radius.100'
                }}>
                  <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Text size="small" weight="semibold">✅ Style Guide Active</Text>
                      <Box paddingTop="space.050">
                        <Text size="small">
                          {styleGuideFile ? styleGuideFile.name : 'Style guide loaded'} 
                          ({(styleGuideContent.length / 1024).toFixed(1)}KB)
                        </Text>
                      </Box>
                    </Box>
                    <Button
                      appearance="subtle"
                      spacing="compact"
                      onClick={removeStyleGuide}
                      style={{ color: '#d32f2f' }}
                    >
                      ✕ Remove
                    </Button>
                  </Box>
                  <Box paddingTop="space.100">
                    <Text size="small" color="color.text.subtle">
                      Translations will be automatically checked against your style guide requirements.
                    </Text>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Style Compliance Results */}
      {styleComplianceResults && (
        <Box paddingTop="space.300">
          <Text size="medium">📋 Style Compliance Analysis</Text>
          <Box paddingTop="space.150" xcss={{
            padding: 'space.150',
            backgroundColor: styleComplianceResults.compliant ? '#e8f5e8' : '#fff3e0',
            border: `1px solid ${styleComplianceResults.compliant ? '#4caf50' : '#ff8f00'}`,
            borderRadius: 'border.radius.100',
            borderLeft: `4px solid ${styleComplianceResults.compliant ? '#4caf50' : '#ff8f00'}`
          }}>
            <Text size="small" weight="semibold">
              {styleComplianceResults.compliant ? '✅ Style Compliant' : '⚠️ Style Issues Found'}
              <span style={{
                marginLeft: '8px',
                backgroundColor: styleComplianceResults.compliant ? '#4caf50' : '#ff8f00',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px'
              }}>
                {styleComplianceResults.score}% compliant
              </span>
            </Text>
            
            <Box paddingTop="space.100">
              <Text style={{ whiteSpace: 'pre-wrap' }}>{styleComplianceResults.analysis}</Text>
            </Box>
            
            {styleComplianceResults.suggestions && styleComplianceResults.suggestions.length > 0 && (
              <Box paddingTop="space.150">
                <Text size="small" weight="semibold">Improvement Suggestions:</Text>
                {styleComplianceResults.suggestions.map((suggestion, index) => (
                  <Box key={index} paddingTop="space.050">
                    <Text size="small">• {suggestion}</Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Team Collaboration Panel */}
      {showCollaborationPanel && (
        <Box paddingTop="space.400" xcss={{
          padding: 'space.300',
          backgroundColor: 'color.background.neutral.subtle',
          border: '1px solid var(--ds-border-neutral)',
          borderRadius: 'border.radius.100'
        }}>
          <Text size="medium" weight="semibold">👥 Team Collaboration</Text>
          
          {/* Assignments Section */}
          <Box paddingTop="space.200">
            <Text size="small" weight="semibold">Project Team & Assignments:</Text>
            <Box paddingTop="space.150" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Box>
                <Text size="small">Assigned Translator:</Text>
                <TextArea
                  placeholder="Enter translator name..."
                  value={assignedTranslator}
                  onChange={(e) => setAssignedTranslator(e.target.value)}
                  onBlur={updateAssignments}
                  rows={1}
                />
              </Box>
              <Box>
                <Text size="small">Assigned Reviewer:</Text>
                <TextArea
                  placeholder="Enter reviewer name..."
                  value={assignedReviewer}
                  onChange={(e) => setAssignedReviewer(e.target.value)}
                  onBlur={updateAssignments}
                  rows={1}
                />
              </Box>
              <Box>
                <Text size="small">Project Lead:</Text>
                <TextArea
                  placeholder="Enter project lead name..."
                  value={projectLead}
                  onChange={(e) => setProjectLead(e.target.value)}
                  onBlur={updateAssignments}
                  rows={1}
                />
              </Box>
              <Box>
                <Text size="small">Due Date:</Text>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onBlur={updateAssignments}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Comments Section */}
          <Box paddingTop="space.300">
            <Text size="small" weight="semibold">Comments & Discussion:</Text>
            
            <Box paddingTop="space.150">
              <TextArea
                placeholder="Add a comment or note for the team..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Box paddingTop="space.100">
                <Button 
                  onClick={addComment} 
                  appearance="primary" 
                  spacing="compact"
                  isDisabled={!newComment.trim() || isAddingComment}
                >
                  {isAddingComment ? 'Adding...' : 'Add Comment'}
                </Button>
              </Box>
            </Box>

            <Box paddingTop="space.200" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {comments.length === 0 ? (
                <Text size="small" color="color.text.subtle">No comments yet. Start the discussion!</Text>
              ) : (
                comments.map((comment, index) => (
                  <Box key={index} paddingBottom="space.150" xcss={{
                    padding: 'space.150',
                    backgroundColor: 'color.background.default',
                    borderRadius: 'border.radius.100',
                    border: '1px solid var(--ds-border-neutral)',
                    marginBottom: 'space.100'
                  }}>
                    <Box paddingBottom="space.050" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text size="small" weight="semibold">{comment.userName}</Text>
                      <Text size="small" color="color.text.subtle">
                        {timeAgo(comment.timestamp)}
                      </Text>
                    </Box>
                    <Text size="small">{comment.comment}</Text>
                  </Box>
                ))
              )}
            </Box>
          </Box>

          {/* Activity Feed */}
          <Box paddingTop="space.300">
            <Text size="small" weight="semibold">Recent Activity:</Text>
            <Box paddingTop="space.150" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {activityFeed.length === 0 ? (
                <Text size="small" color="color.text.subtle">No recent activity.</Text>
              ) : (
                activityFeed.slice(0, 10).map((activity, index) => (
                  <Box key={index} paddingBottom="space.100">
                    <Text size="small">
                      <strong>{activity.userName}</strong> {activity.details}
                      <span style={{ color: '#666', marginLeft: '8px' }}>
                        - {timeAgo(activity.timestamp)}
                      </span>
                    </Text>
                  </Box>
                ))
              )}
            </Box>
          </Box>

          {/* Change History */}
          <Box paddingTop="space.300">
            <Text size="small" weight="semibold">Change History:</Text>
            <Box paddingTop="space.150" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {changeHistory.length === 0 ? (
                <Text size="small" color="color.text.subtle">No changes recorded yet.</Text>
              ) : (
                changeHistory.slice(0, 10).map((change, index) => (
                  <Box key={index} paddingBottom="space.100" xcss={{
                    padding: 'space.100',
                    backgroundColor: '#f8f9fa',
                    borderRadius: 'border.radius.050',
                    marginBottom: 'space.050'
                  }}>
                    <Text size="small">
                      <strong>{change.userName}</strong> modified <em>{change.field}</em>
                      <span style={{ color: '#666', marginLeft: '8px' }}>
                        - {timeAgo(change.timestamp)}
                      </span>
                    </Text>
                    <Box paddingTop="space.050">
                      <Text size="small" color="color.text.subtle">
                        Reason: {change.reason}
                      </Text>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Box>

          <Box paddingTop="space.300" style={{ textAlign: 'center' }}>
            <Button
              appearance="subtle"
              onClick={() => setShowCollaborationPanel(false)}
            >
              Close Collaboration Panel
            </Button>
          </Box>
        </Box>
      )}

      {/* Translation Memory Matches */}
      {(tmMatches.length > 0 || isSearchingTM) && (
        <Box paddingTop="space.300">
          <Text size="medium">🔄 Translation Memory Matches</Text>
          <Box paddingTop="space.100">
            <Text size="small">
              {isSearchingTM ? 'Searching translation memory...' : `Found ${tmMatches.length} matching translation${tmMatches.length !== 1 ? 's' : ''} from previous work`}
            </Text>
          </Box>
          
          {tmMatches.length > 0 && (
            <Box paddingTop="space.150">
              {tmMatches.slice(0, 3).map((match, index) => (
                <Box key={index} paddingTop="space.100" xcss={{
                  padding: 'space.150',
                  backgroundColor: match.matchScore === 100 ? '#e8f5e8' : '#f0f8ff',
                  border: `1px solid ${match.matchScore === 100 ? '#4caf50' : '#2196f3'}`,
                  borderRadius: 'border.radius.100',
                  borderLeft: `4px solid ${match.matchScore === 100 ? '#4caf50' : '#2196f3'}`
                }}>
                  <Box paddingBottom="space.100">
                    <Text size="small" weight="semibold">
                      {match.matchScore === 100 ? '🎯 Exact Match' : `🔍 ${match.matchScore}% Match`}
                      <span style={{
                        marginLeft: '8px',
                        backgroundColor: match.confidence === 'user-approved' ? '#4caf50' : '#ff9800',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px'
                      }}>
                        {match.confidence}
                      </span>
                      {match.usageCount > 0 && (
                        <span style={{ marginLeft: '8px', fontSize: '11px', color: '#666' }}>
                          Used {match.usageCount} time{match.usageCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </Text>
                  </Box>
                  
                  <Box paddingBottom="space.100">
                    <Text size="small" weight="semibold">Source:</Text>
                    <Box xcss={{ backgroundColor: 'color.background.neutral', padding: 'space.100', borderRadius: 'border.radius.050', marginTop: 'space.050' }}>
                      <Text size="small">"{match.source}"</Text>
                    </Box>
                  </Box>

                  <Box paddingBottom="space.100">
                    <Text size="small" weight="semibold">Translation:</Text>
                    <Box xcss={{ backgroundColor: '#e3fcef', padding: 'space.100', borderRadius: 'border.radius.050', marginTop: 'space.050' }}>
                      <Text size="small">"{match.target}"</Text>
                    </Box>
                  </Box>

                  <Box paddingTop="space.100">
                    <Button
                      appearance="primary"
                      spacing="compact"
                      onClick={() => applyTMSuggestion(match)}
                      style={{ fontSize: '12px' }}
                    >
                      Use This Translation
                    </Button>
                    <Text size="small" color="color.text.subtle" style={{ marginLeft: '12px' }}>
                      From: {match.context} | {new Date(match.timestamp).toLocaleDateString()}
                    </Text>
                  </Box>
                </Box>
              ))}
              
              {tmMatches.length > 3 && (
                <Box paddingTop="space.100">
                  <Text size="small" color="color.text.subtle">
                    ... and {tmMatches.length - 3} more match{tmMatches.length - 3 !== 1 ? 'es' : ''}. Use "Browse Translation Memory" to see all.
                  </Text>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* AI Translation Section */}
      <Box paddingTop="space.400">
        <Text size="medium">🤖 AI Translation</Text>
        <Box paddingTop="space.100">
          <Text size="small">
            Translate using AI-powered language processing
            {tmMatches.length > 0 && (
              <span style={{ color: '#666', fontStyle: 'italic' }}>
                {' '}(or use Translation Memory matches above)
              </span>
            )}
          </Text>
        </Box>
        <Box paddingTop="space.150">
          <Select
            label="Target Language"
            value={targetLanguage}
            onChange={(value) => {
              setTargetLanguage(value);
              // Auto-save preference when changed
              if (issueKey) {
                invoke('saveProjectPreferences', { 
                  issueKey, 
                  preferences: {
                    enableConsistencyCheck,
                    workflow: currentWorkflow,
                    targetLanguage: value
                  }
                }).catch(error => console.error('Error saving preferences:', error));
              }
            }}
            options={[
              { label: 'Spanish', value: 'Spanish' },
              { label: 'French', value: 'French' },
              { label: 'German', value: 'German' },
              { label: 'Italian', value: 'Italian' },
              { label: 'Portuguese', value: 'Portuguese' },
              { label: 'Japanese', value: 'Japanese' },
              { label: 'Chinese', value: 'Chinese' },
              { label: 'Korean', value: 'Korean' },
              { label: 'Russian', value: 'Russian' },
              { label: 'Arabic', value: 'Arabic' },
              { label: 'Hindi', value: 'Hindi' },
              { label: 'Dutch', value: 'Dutch' },
              { label: 'Polish', value: 'Polish' }
            ]}
          />
        </Box>
        <Box paddingTop="space.150">
          <Button 
            appearance="primary" 
            onClick={handleAITranslation}
            isDisabled={isTranslating || !textToCheck.trim()}
          >
            {isTranslating ? 'Translating...' : `Translate to ${targetLanguage}`}
          </Button>
        </Box>
        
        {translationResult && (
          <Box paddingTop="space.200" xcss={{
            padding: 'space.150',
            backgroundColor: 'color.background.success.subtle',
            borderRadius: 'border.radius.100',
            border: '1px solid var(--ds-border-success)'
          }}>
            <Text size="small" weight="semibold">AI Translation Result:</Text>
            <Box paddingTop="space.100">
              <Text style={{ whiteSpace: 'pre-wrap' }}>{translationResult}</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* File Upload Section */}
      <Box paddingTop="space.400">
        <Text size="medium">📁 File Upload & Processing</Text>
        <Box paddingTop="space.100">
          <Text size="small">Upload translation files (XLIFF, TXT, CSV) for processing and consistency analysis</Text>
        </Box>
        
        <Box paddingTop="space.150">
          <Text size="small" weight="semibold">Supported Formats:</Text>
          <Box paddingTop="space.050">
            <Text size="small">• XLIFF files (.xlf, .xlz) - Standard translation format</Text>
            <Text size="small">• TMX files (.tmx) - Translation Memory Exchange format</Text>
            <Text size="small">• Gettext files (.po) - GNU gettext format</Text>
            <Text size="small">• Text files (.txt) - Plain text content</Text>
            <Text size="small">• CSV files (.csv) - Source,Target columns</Text>
          </Box>
        </Box>
        
        <Box paddingTop="space.150">
          <input
            id="fileUpload"
            type="file"
            accept=".xlf,.xliff,.xlz,.tmx,.po,.txt,.csv"
            onChange={handleFileUpload}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </Box>
        
        {uploadedFile && (
          <Box paddingTop="space.100">
            <Text size="small">
              📄 <strong>{uploadedFile.name}</strong> ({(uploadedFile.size / 1024).toFixed(1)} KB)
              <Button 
                appearance="subtle" 
                onClick={clearFile}
                spacing="compact"
                style={{ marginLeft: '8px' }}
              >
                ✕ Remove
              </Button>
            </Text>
          </Box>
        )}
        
        {fileProcessing && (
          <Box paddingTop="space.150">
            <Text size="small">🔄 Processing file...</Text>
          </Box>
        )}
        
        {fileProcessingResult && (
          <Box paddingTop="space.200" xcss={{
            padding: 'space.150',
            backgroundColor: 'color.background.discovery.subtle',
            borderRadius: 'border.radius.100',
            border: '1px solid var(--ds-border-discovery)'
          }}>
            <Text size="small" weight="semibold">File Processing Results:</Text>
            <Box paddingTop="space.100">
              <Text style={{ whiteSpace: 'pre-wrap' }}>{fileProcessingResult}</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Automated Consistency Analyzer Section */}
      <Box paddingTop="space.400">
        <Text size="medium">🔍 Automated Consistency Analyzer</Text>
        <Box paddingTop="space.100">
          <Text size="small">Analyze translations for terminology consistency automatically using AI</Text>
        </Box>
        
        <Box paddingTop="space.150">
          <Checkbox
            name="enableConsistencyCheck"
            value="enableConsistencyCheck"
            label="Enable consistency checking"
            isChecked={enableConsistencyCheck}
            onChange={(isChecked) => {
              setEnableConsistencyCheck(isChecked);
              // Auto-save preference when changed
              if (issueKey) {
                invoke('saveProjectPreferences', { 
                  issueKey, 
                  preferences: {
                    enableConsistencyCheck: isChecked,
                    workflow: currentWorkflow,
                    targetLanguage
                  }
                }).catch(error => console.error('Error saving preferences:', error));
              }
            }}
          />
          <Box paddingTop="space.050">
            <Text size="small" color="color.text.subtle">
              {enableConsistencyCheck 
                ? "Will analyze repeated segments for translation consistency" 
                : "Variation in translation will be allowed - good for creative content"}
            </Text>
          </Box>
        </Box>
        
        <Box paddingTop="space.150">
          <Text size="small" weight="semibold">Source Text:</Text>
          <TextArea
            placeholder="Enter the original source text..."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={4}
          />
        </Box>
        
        <Box paddingTop="space.150">
          <Text size="small" weight="semibold">Translated Text:</Text>
          <TextArea
            placeholder="Enter the translated text..."
            value={translatedText}
            onChange={(e) => setTranslatedText(e.target.value)}
            rows={4}
          />
        </Box>
        
        <Box paddingTop="space.150">
          <Button 
            appearance="primary" 
            onClick={handleConsistencyAnalysis}
            isDisabled={isAnalyzingConsistency || !sourceText.trim() || !translatedText.trim() || !enableConsistencyCheck}
          >
            {isAnalyzingConsistency ? (
              `Analyzing... ${analysisProgress}%`
            ) : (
              `Analyze Consistency Automatically ${consistencyResults?.count > 0 ? `(${consistencyResults.count} issues found)` : ''}`
            )}
          </Button>
          
          {/* Progress Bar */}
          {isAnalyzingConsistency && (
            <Box paddingTop="space.100">
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#f0f0f0',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${analysisProgress}%`,
                  height: '100%',
                  backgroundColor: '#0052cc',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <Text size="small" color="color.text.subtle">
                {analysisProgress < 30 ? 'Analyzing text structure...' :
                 analysisProgress < 60 ? 'Finding repeated segments...' :
                 analysisProgress < 90 ? 'Running AI analysis...' :
                 'Finalizing results...'}
              </Text>
            </Box>
          )}
        </Box>
        
        {/* Enhanced Results Display */}
        {consistencyResults && (
          <Box paddingTop="space.200">
            {/* Summary Header */}
            <Box xcss={{
              padding: 'space.150',
              backgroundColor: consistencyResults.count === 0 ? 'color.background.success.subtle' : 'color.background.warning.subtle',
              borderRadius: 'border.radius.100',
              border: `1px solid ${consistencyResults.count === 0 ? 'var(--ds-border-success)' : 'var(--ds-border-warning)'}`
            }}>
              <Text size="small" weight="semibold">
                🔍 Consistency Analysis Complete
                {consistencyResults.count > 0 && (
                  <span style={{
                    marginLeft: '8px',
                    backgroundColor: '#de350b',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {consistencyResults.count} issues
                  </span>
                )}
              </Text>
              <Box paddingTop="space.050">
                <Text size="small">
                  {consistencyResults.count === 0 
                    ? 'No consistency issues found. Translation terminology is consistent.' 
                    : `Found ${consistencyResults.count} terminology inconsistencies that need review.`}
                </Text>
              </Box>
            </Box>

            {/* Individual Issues */}
            {consistencyResults.issues && consistencyResults.issues.map((issue, index) => (
              <Box key={index} paddingTop="space.150" xcss={{
                padding: 'space.150',
                backgroundColor: issue.resolved ? 'color.background.success.subtle' : 'color.background.neutral.subtle',
                borderRadius: 'border.radius.100',
                border: `1px solid ${issue.severity === 'high' ? '#de350b' : issue.severity === 'medium' ? '#ff8b00' : '#0052cc'}`,
                borderLeft: `4px solid ${issue.severity === 'high' ? '#de350b' : issue.severity === 'medium' ? '#ff8b00' : '#0052cc'}`
              }}>
                <Box paddingBottom="space.100">
                  <Text size="small" weight="semibold">
                    <span style={{
                      backgroundColor: issue.severity === 'high' ? '#de350b' : issue.severity === 'medium' ? '#ff8b00' : '#0052cc',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      marginRight: '8px'
                    }}>
                      {issue.severity.toUpperCase()}
                    </span>
                    Issue #{index + 1}
                    {issue.resolved && (
                      <span style={{ marginLeft: '8px', color: '#00875a' }}>✓ Resolved</span>
                    )}
                  </Text>
                </Box>
                
                <Box paddingBottom="space.100">
                  <Text size="small" weight="semibold">Source:</Text>
                  <Box xcss={{
                    backgroundColor: 'color.background.neutral',
                    padding: 'space.100',
                    borderRadius: 'border.radius.050',
                    marginTop: 'space.050'
                  }}>
                    <Text size="small">"{issue.source}"</Text>
                  </Box>
                </Box>

                <Box paddingBottom="space.100">
                  <Text size="small" weight="semibold">Inconsistent Translations:</Text>
                  {issue.translations.map((translation, tIndex) => (
                    <Box key={tIndex} xcss={{
                      backgroundColor: '#fff2e0',
                      border: '1px solid #ff8b00',
                      padding: 'space.100',
                      borderRadius: 'border.radius.050',
                      marginTop: 'space.050'
                    }}>
                      <Text size="small">
                        <strong>Version {tIndex + 1}:</strong> "{translation}"
                      </Text>
                    </Box>
                  ))}
                </Box>

                <Box paddingBottom="space.100">
                  <Text size="small" weight="semibold">AI Recommendation:</Text>
                  <Box xcss={{
                    backgroundColor: '#e3fcef',
                    border: '1px solid #00875a',
                    padding: 'space.100',
                    borderRadius: 'border.radius.050',
                    marginTop: 'space.050'
                  }}>
                    <Text size="small">{issue.recommendation}</Text>
                  </Box>
                </Box>

                {!issue.resolved && issue.translations.length > 0 && (
                  <Box paddingTop="space.100">
                    <Text size="small" weight="semibold">Quick Actions:</Text>
                    <Box paddingTop="space.050" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {issue.translations.map((translation, tIndex) => (
                        <Button
                          key={tIndex}
                          appearance="subtle"
                          spacing="compact"
                          onClick={() => applySuggestion(issue.id, translation)}
                          style={{ fontSize: '12px' }}
                        >
                          Use "{translation.length > 20 ? translation.substring(0, 20) + '...' : translation}"
                        </Button>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Fallback Text Display */}
        {consistencyReport && !consistencyResults && (
          <Box paddingTop="space.200" xcss={{
            padding: 'space.150',
            backgroundColor: 'color.background.information.subtle',
            borderRadius: 'border.radius.100',
            border: '1px solid var(--ds-border-information)'
          }}>
            <Text size="small" weight="semibold">Automated Consistency Analysis:</Text>
            <Box paddingTop="space.100">
              <Text style={{ whiteSpace: 'pre-wrap' }}>{consistencyReport}</Text>
            </Box>
          </Box>
        )}

      {/* Translation Memory Browser Modal */}
      {showTMBrowser && (
        <Box paddingTop="space.400" xcss={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Box xcss={{
            backgroundColor: 'color.background.default',
            borderRadius: 'border.radius.200',
            padding: 'space.400',
            maxWidth: '800px',
            maxHeight: '600px',
            overflow: 'auto',
            margin: 'space.200'
          }}>
            <Box paddingBottom="space.300" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text size="large" weight="bold">📚 Translation Memory Browser</Text>
              <Button appearance="subtle" onClick={() => setShowTMBrowser(false)}>✕</Button>
            </Box>

            <Box paddingBottom="space.200">
              <Text size="medium">Language Pair: English → {targetLanguage}</Text>
              <Text size="small" color="color.text.subtle">
                Showing your organization's translation memory for reuse and consistency
              </Text>
            </Box>

            {tmBrowseResults.length === 0 ? (
              <Box paddingTop="space.200">
                <Text size="medium">No translations found in memory for this language pair yet.</Text>
                <Text size="small" color="color.text.subtle">
                  Start translating to build your organization's translation memory!
                </Text>
              </Box>
            ) : (
              <Box>
                <Text size="small" weight="semibold" style={{ marginBottom: '16px' }}>
                  {tmBrowseResults.length} translation{tmBrowseResults.length !== 1 ? 's' : ''} in memory:
                </Text>
                
                {tmBrowseResults.map((entry, index) => (
                  <Box key={index} paddingBottom="space.200" xcss={{
                    padding: 'space.150',
                    backgroundColor: 'color.background.neutral.subtle',
                    border: '1px solid var(--ds-border-neutral)',
                    borderRadius: 'border.radius.100',
                    marginBottom: 'space.100'
                  }}>
                    <Box paddingBottom="space.100" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        backgroundColor: entry.confidence === 'user-approved' ? '#4caf50' : '#ff9800',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        {entry.confidence}
                      </span>
                      <Text size="small" color="color.text.subtle">
                        {entry.usageCount} use{entry.usageCount !== 1 ? 's' : ''} | {new Date(entry.timestamp).toLocaleDateString()}
                      </Text>
                    </Box>
                    
                    <Box paddingBottom="space.100">
                      <Text size="small" weight="semibold">Source:</Text>
                      <Text size="small" style={{ marginLeft: '8px' }}>"{entry.source}"</Text>
                    </Box>
                    
                    <Box paddingBottom="space.100">
                      <Text size="small" weight="semibold">Translation:</Text>
                      <Text size="small" style={{ marginLeft: '8px' }}>"{entry.target}"</Text>
                    </Box>
                    
                    <Text size="small" color="color.text.subtle">
                      Context: {entry.context}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}

            <Box paddingTop="space.300" style={{ display: 'flex', justifyContent: 'center' }}>
              <Button appearance="primary" onClick={() => setShowTMBrowser(false)}>
                Close
              </Button>
            </Box>
          </Box>
        </Box>
      )}
      </Box>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
