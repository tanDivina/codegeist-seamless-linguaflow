## ⚠️ Environment Requirements

This app needs to be deployed from a local machine with GUI access (not a headless server) due to Forge CLI authentication requirements.

## 🛠️ Pre-Deployment Setup

### 1. Install Prerequisites
```bash
# Install Forge CLI (latest version)
npm install -g @forge/cli@latest

# Verify installation
forge --version
```

### 2. Authentication
```bash
# Login to Forge (requires browser access)
forge login
```

### 3. Environment Variables
```bash
# Set your Gemini API key (required for AI features)
forge variables set --encrypt GEMINI_API_KEY your_gemini_api_key_here

# Verify variables are set
forge variables list
```

## 🚀 Deployment Steps

### 1. Deploy the App
```bash
cd Seamless-LinguaFlow
forge deploy
```

### 2. Install on Jira Site
```bash
# Install on your Jira instance
forge install --product jira

# Follow prompts to select your Jira site
# Grant required permissions:
# - Storage API access
# - External API access (for Gemini)
```

### 3. Verify Installation
1. Navigate to any Jira issue
2. Look for "Seamless LinguaFlow" in the issue panel
3. Test basic functionality

## 🧪 Testing Checklist

### Basic Functionality
- [ ] **Panel Loads**: App appears in Jira issue panel
- [ ] **Language Selection**: Can change target language
- [ ] **Workflow Stages**: Status progresses through 5 stages
- [ ] **Preferences Persist**: Settings save and restore

### AI Features (Requires Gemini API Key)
- [ ] **Quality Check**: AI analyzes text quality
- [ ] **Translation**: AI translates text accurately
- [ ] **Consistency Analysis**: Detects repeated segments

### Advanced Features
- [ ] **Optional Consistency**: Checkbox enables/disables checking
- [ ] **Project Memory**: Preferences save per issue
- [ ] **Rovo Integration**: Translation agent responds in chat

### File Upload Features
- [ ] **XLIFF Upload**: Upload .xlf/.xlz files, get instant analysis
- [ ] **TMX Processing**: Upload translation memory files
- [ ] **Gettext Support**: Upload .po files for software localization
- [ ] **CSV/Text Upload**: Simple file formats work seamlessly
- [ ] **Automatic Analysis**: Files with translations get instant consistency checking

## 🔧 Troubleshooting

### Common Issues

#### App Not Visible
- Check app is installed: `forge list`
- Verify permissions granted during installation
- Try refreshing Jira page

#### AI Features Not Working
- Verify API key: `forge variables list`
- Check API key is valid and has credits
- Look for error messages in browser console

#### Preferences Not Saving
- Verify storage permissions granted
- Check browser console for storage errors
- Try advancing workflow to trigger save

### Development Mode
```bash
# For live development/debugging
forge tunnel

# In another terminal, view logs
forge logs --tail
```

## 📊 Success Metrics

### Core Functionality Working
✅ **Translation Workflow**: All 5 stages functional
✅ **AI Integration**: Quality check and translation working
✅ **Consistency Analysis**: Automated detection and AI review
✅ **Project Memory**: Settings persist across sessions

### User Experience Quality
✅ **Responsive UI**: Fast loading and smooth interactions
✅ **Error Handling**: Graceful fallbacks for API failures
✅ **Visual Polish**: Professional appearance with Atlassian Design System

### Innovation Showcase
✅ **Automated Consistency**: Demonstrates enterprise TMS capabilities
✅ **Content-Aware Analysis**: Optional checking for different content types
✅ **AI-Human Collaboration**: Smart division of labor between code and AI

## 🎯 Demo Script

### 1. Basic Translation (2 minutes)
1. Open any Jira issue
2. Show Seamless-LinguaFlow panel
3. Enter text in quality check area
4. Run quality analysis
5. Translate text to target language
6. Advance through workflow stages

### 2. Consistency Analysis Demo (3 minutes)
1. Enable consistency checking (show checkbox)
2. Enter source text with repeated segments:
   ```
   The user should click Save. Please ensure data is valid. 
   The user should click Save to continue.
   ```
3. Enter translation with inconsistencies:
   ```
   El usuario debe hacer clic en Guardar. Asegúrese de que los datos sean válidos.
   El usuario debería presionar Salvar para continuar.
   ```
4. Run consistency analysis
5. Show AI's professional linguistic review
6. Demonstrate optional nature by disabling checkbox

### 3. Project Memory Demo (1 minute)
1. Change language to French
2. Disable consistency checking
3. Refresh page
4. Show settings are remembered

## 🏆 Key Selling Points

1. **Enterprise TMS Features**: Automated consistency analysis typically found in $10,000+ translation tools
2. **Zero Configuration**: No manual glossary setup required
3. **Native Integration**: Works within existing Jira workflow
4. **AI-Powered**: Professional linguistic analysis and translation
5. **Content-Type Awareness**: Adapts to technical vs creative content
6. **Team Collaboration**: Shared project settings and status tracking

Ready for deployment! 🚀