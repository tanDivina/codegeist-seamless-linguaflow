# 📁 Supported File Formats - Seamless LinguaFlow

## Overview

Seamless-LinguaFlow supports industry-standard translation file formats, making it compatible with existing CAT (Computer-Assisted Translation) tools and professional translation workflows.

---

## 🏭 **Industry Standard Formats**

### XLIFF (.xlf, .xlz)
**XML Localization Interchange File Format**

- **Use Case**: Standard exchange format between CAT tools
- **Compatible Tools**: SDL Trados, MemoQ, Wordfast, OmegaT
- **Features Supported**:
  - Source and target segment extraction
  - Translation status detection
  - Automatic consistency analysis for translated segments
  - Statistics: total segments, translated count, untranslated count

**Sample Structure**:
```xml
<trans-unit id="1">
  <source>Click Save to continue</source>
  <target>Haga clic en Guardar para continuar</target>
</trans-unit>
```

### TMX (.tmx)  
**Translation Memory Exchange**

- **Use Case**: Sharing translation memories between different tools
- **Compatible Tools**: All major CAT tools, Translation Management Systems
- **Features Supported**:
  - Multi-language translation unit extraction
  - Language pair identification
  - Automatic consistency analysis across translation variants
  - Statistics: translation units, completion rates per language

**Sample Structure**:
```xml
<tu tuid="1">
  <tuv xml:lang="en">
    <seg>Save your work regularly</seg>
  </tuv>
  <tuv xml:lang="es">
    <seg>Guarde su trabajo regularmente</seg>
  </tuv>
</tu>
```

### Gettext (.po)
**GNU Gettext Portable Object**

- **Use Case**: Software localization, open source projects
- **Compatible Tools**: Poedit, Gtranslator, Lokalize, web-based tools like Weblate
- **Features Supported**:
  - msgid/msgstr pair extraction
  - Translation completion tracking
  - Automatic consistency analysis
  - Statistics: total messages, translated count, untranslated count

**Sample Structure**:
```
msgid "Enter your username"
msgstr "Ingrese su nombre de usuario"

msgid "Click Save to store changes"  
msgstr "Haga clic en Guardar para almacenar cambios"
```

---

## 📊 **Simple Exchange Formats**

### CSV (.csv)
**Comma-Separated Values**

- **Use Case**: Simple translation lists, terminology management
- **Structure**: Source,Target,Notes columns
- **Features Supported**:
  - Source/target pair extraction
  - Notes field recognition
  - Automatic consistency analysis
  - Statistics: translation pairs, completion rates

**Sample Structure**:
```csv
Source,Target,Notes
"Click the Save button","Haga clic en el botón Guardar","UI Element"
"Enter your password","Ingrese su contraseña","Form Field"
```

### Text (.txt)
**Plain Text Files**

- **Use Case**: Source content for translation, documentation
- **Features Supported**:
  - Line-by-line or paragraph processing
  - Character and line counting
  - Integration with AI translation features
  - Preparation for translation workflow

---

## 🔍 **Automatic Processing Features**

### Smart Content Extraction
- **Intelligent Parsing**: Recognizes structure of each format
- **Text Cleaning**: Removes formatting tags, preserves meaningful content
- **Segment Mapping**: Links source segments to their translations

### Instant Statistics
- **Completion Metrics**: Shows translation progress at a glance
- **Segment Counts**: Total, translated, and untranslated segments
- **File Information**: Size, format, processing status

### Automated Consistency Analysis
- **On-Upload Analysis**: Automatically runs when translations are present
- **Format-Aware**: Understands context from file structure
- **Professional Reports**: AI-powered linguistic analysis of inconsistencies

---

## 🛠 **Integration Workflow**

### 1. Upload from Existing Tools
```
CAT Tool (SDL Trados, MemoQ) → Export XLIFF/TMX → Upload to Seamless-LinguaFlow
```

### 2. Analysis and Review
```
File Upload → Automatic Processing → Consistency Analysis → Team Review in Jira
```

### 3. Workflow Integration
```
Upload → Analysis → Jira Issue Tracking → Collaborative Review → Completion
```

---

## 📋 **Sample Files for Testing**

### Provided Sample Files:
- **`sample-inconsistent.xlf`**: XLIFF with terminology inconsistencies for demo
- **`sample-partial.xlf`**: XLIFF with partially translated content
- **`sample-tmx.tmx`**: TMX file with repeated segments and variations
- **`sample-gettext.po`**: Gettext file with software UI translations
- **`sample-translations.csv`**: CSV with source/target pairs and inconsistencies
- **`sample-source.txt`**: Plain text content ready for translation

### Testing Scenarios:
1. **Consistency Detection**: Upload `sample-inconsistent.xlf` to see AI analysis
2. **Completion Tracking**: Upload `sample-partial.xlf` to see translation progress
3. **Multi-Format**: Test different formats to see processing differences
4. **Workflow Integration**: Upload, analyze, then advance through Jira stages

---

## 🎯 **Professional Use Cases**

### Technical Documentation Team
- **Upload**: XLIFF files from SDL Trados projects
- **Analyze**: Check terminology consistency across documentation
- **Track**: Monitor translation progress in Jira issues
- **Collaborate**: Team review of consistency analysis results

### Software Localization Team  
- **Upload**: Gettext .po files from development workflow
- **Analyze**: Ensure UI terminology consistency
- **Track**: Link translations to feature development in Jira
- **Collaborate**: Developer and translator collaboration

### Marketing Content Team
- **Upload**: TMX files from previous campaigns
- **Analyze**: Optional consistency for creative content
- **Track**: Campaign translation status in Jira
- **Collaborate**: Creative and linguistic team alignment

### Translation Service Provider
- **Upload**: Client XLIFF files from various CAT tools
- **Analyze**: Quality assurance before delivery
- **Track**: Multiple client projects in Jira
- **Collaborate**: Translator and PM coordination

---

## 🚀 **Future Enhancements**

### Planned Format Support:
- **SDLXLIFF**: SDL Trados native format with advanced metadata
- **MQXLZ**: MemoQ package format
- **DOCX**: Microsoft Word with track changes
- **JSON**: Web/mobile app localization files

### Advanced Features:
- **Batch Processing**: Multiple files at once
- **Format Conversion**: Convert between different formats
- **Metadata Preservation**: Maintain CAT tool specific information
- **Export Capabilities**: Generate reports and processed files

---

**Seamless-LinguaFlow brings enterprise translation file format support directly into your Atlassian workflow, eliminating the need for separate translation management tools.** 🌍