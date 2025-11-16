# Contributing to Seamless-LinguaFlow

Thank you for your interest in contributing to Seamless-LinguaFlow! This project was built for Atlassian Codegeist 2024 and we welcome contributions from the community.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Atlassian Forge CLI
- Atlassian Developer Account
- Gemini API Key

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/codegeist-seamless-linguaflow.git`
3. Navigate to project: `cd codegeist-seamless-linguaflow/Seamless-LinguaFlow`
4. Install dependencies: `npm install`
5. Set up environment: `forge variables set --encrypt GEMINI_API_KEY your_api_key`
6. Start development: `forge tunnel`

## 🎯 How to Contribute

### Reporting Bugs
- Use GitHub Issues with the "bug" label
- Include steps to reproduce
- Provide environment details (Forge version, browser, etc.)

### Suggesting Features
- Use GitHub Issues with the "enhancement" label
- Describe the use case and expected behavior
- Consider Atlassian ecosystem integration

### Code Contributions
1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes
3. Test thoroughly with `forge tunnel`
4. Commit with clear messages
5. Push and create a Pull Request

## 🏗️ Project Structure

- `/src/index.js` - Main resolver functions
- `/src/rovo.js` - Rovo agent implementation  
- `/src/frontend/index.jsx` - React UI components
- `/sample-files/` - Test files for different formats
- `manifest.yml` - Forge app configuration

## 🧪 Testing

- Test with different file formats (XLIFF, TMX, gettext)
- Verify Rovo agent responses
- Check consistency analysis accuracy
- Test workflow progression

## 📝 Code Style

- Follow ESLint configuration
- Use Atlassian Design System components
- Write clear, descriptive function names
- Add comments for complex logic

## 📋 Pull Request Process

1. Update documentation if needed
2. Test on multiple Jira instances
3. Ensure no breaking changes
4. Update version numbers if applicable
5. Request review from maintainers

## 🤝 Community Guidelines

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers to Forge development
- Share knowledge about translation workflows

## 📞 Getting Help

- Check existing GitHub Issues
- Review [Atlassian Forge Documentation](https://developer.atlassian.com/platform/forge/)
- Ask questions in discussions

---

Built with ❤️ for the Atlassian Community | Codegeist 2024