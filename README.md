
# Keyflow

_A modern, minimalistic typing practice application built for typing enthusiast_

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-blue?style=for-the-badge)](https://keyflow-bay.vercel.app/) [![Video Demo](https://img.shields.io/badge/Video%20Demo-Watch%20Now-red?style=for-the-badge)](https://youtu.be/5zWI6RrTxos)

----------

## What is Keyflow?

Keyflow is a minimalistic typing web app built with modern web technologies, it provides a seamless typing practice experience that adapts to both desktop and mobile environments.

## Distinctiveness & Complexity

Keyflow is designed as a typing practice application centered on real-time performance and interactivity. This focus on continuous user input, instant validation, and live statistics makes it unique within the course context.

In terms of complexity, Keyflow is challenging because of how much happens in real time. Every keystroke from the user is captured, validated, and used to update typing statistics instantly. This required careful use of **React state management**, including Context API and custom hooks, to share data across components efficiently. For example, when the user types a character, the app needs to immediately check if it’s correct, update the cursor, recalculate accuracy and WPM, and re-render the stats on the screen.

Although the frontend (React) holds most of the logic, the **Django backend** is still important. It manages data, provides API endpoints, and handles authentication. Having to integrate React with Django also added to the complexity, since I had to make the two work together smoothly.

Some of the features that made the project complex:

-   Real-time WPM and accuracy calculation
    
-   Multiple text datasets with chunk loading
    
-   Settings panel for customizing font size, sounds, and colors
    
-   Responsive design for both desktop and mobile
    

Altogether, this project proved more challenging than previous ones, as it pushed me beyond my existing skills and required learning many new concepts. The most valuable insight I got is that how the software development lifecycle works, from planning and architecture to implementation and testing, It provide me a practical understanding of how complex applications are built in the real world.

----------

## Architecture



### Real-Time Typing Processing Flow

The core typing engine processes keystrokes with advanced features like dynamic scrolling and focus mode:

```mermaid
flowchart TD
    A[User Keystroke] --> B[handleEnhancedInputChange]
    B --> C[handleInputChange]
    B --> D[handleTypingStart]
    
    C --> E{Character Validation}
    E -->|Correct| F[Mark Correct + Click Sound]
    E -->|Incorrect| G[Mark Incorrect + Error Sound]
    
    F --> H[Update Character Status]
    G --> H
    H --> I[Calculate Progress]
    I --> J{Progress > 70%?}
    
    J -->|Yes| K[Load Next Chunk]
    J -->|No| L[Continue Current]
    
    H --> M[scrollToCurrentChar]
    M --> N[Transform Text Display]
    
    D --> O[Apply Focus Mode]
    O --> P[Hide UI Elements]
    P --> Q[5s Timer Reset]

```

### Dynamic Text Management System

Advanced text chunking and infinite scroll implementation:

```mermaid
graph LR
    A[useText Hook] --> B[Load JSON Dataset]
    B --> C[Shuffle Words Array]
    C --> D[Create Initial 100-word Chunk]
    
    D --> E[useTyping Hook]
    E --> F[Real-time Progress Tracking]
    F --> G{Progress > 80%?}
    
    G -->|Yes| H[checkAndLoadNext]
    G -->|No| I[Continue Current Text]
    
    H --> J[Load Next 100 Words]
    J --> K[Append to Text Display]
    K --> L[Update processedWords Array]
    
    M[End of Dataset?] --> N[Re-shuffle & Restart]
    N --> D
    
    style A fill:#e3f2fd
    style E fill:#f3e5f5
    style H fill:#fff3e0
    style L fill:#e8f5e8

```

### Component Interaction Map

Detailed component relationships and data flow:

```mermaid
graph TB
    A[App.jsx] --> B[Navbar]
    A --> C[Header with WPM Stats]
    A --> D[TypingBox]
    A --> E[Controls]
    A --> F[Status]
    A --> G[SettingsModal]
    
    D --> H[Text Display with Smooth Scrolling]
    D --> I[Invisible Input Field]
    D --> J[Progress Indicator]
    
    E --> K[Shuffle Button]
    E --> L[Settings Button]
    E --> M[Reset Button]
    
    B --> N[Theme Toggle]
    B --> O[User Authentication]
    
    P[SettingsContext] --> Q[Cursor Color]
    P --> R[Font Size]
    P --> S[Sound Enabled]
    P --> T[Text Dataset]
    
    U[ThemeContext] --> V[Dark/Light Mode]
    W[AuthContext] --> X[User State]
    Y[TextDataContext] --> Z[Typing State & Text Management]
    
    style D fill:#e3f2fd
    style P fill:#f3e5f5
    style Y fill:#fff3e0

```

### Advanced Features Architecture

Key sophisticated features implementation:

```mermaid
graph TD
    A[Advanced Features] --> B[Focus Mode System]
    A --> C[Dynamic Audio Feedback]
    A --> D[Smooth Scrolling Engine]
    A --> E[Performance Optimization]
    
    B --> F[CSS Class Manipulation]
    B --> G[5s Auto-timeout]
    B --> H[Shimmer Effects]
    
    C --> I[Audio Objects Creation]
    C --> J[Real-time Sound Playing]
    C --> K[Settings-based Toggle]
    
    D --> L[Character Position Tracking]
    D --> M[Container Bounds Calculation]
    D --> N[Transform Animations]
    
    E --> O[React.memo Optimization]
    E --> P[Debounced Scroll Function]
    E --> Q[Hardware Acceleration]
    
    style A fill:#e8f5e8
    style B fill:#fff3e0
    style D fill:#f3e5f5
    style E fill:#fce4ec

```

----------

## Getting Started

### Prerequisites

-   **Node.js** (v16 or higher)
-   **Python** (v3.8 or higher)
-   **pip** (Python package manager)

#### 1. Clone the Repository

```bash
git clone https://github.com/gaurabprasai/keyflow.git
cd keyflow

```

#### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

```

_Backend will be available at `http://localhost:8000`_

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev

```

_Frontend will be available at `http://localhost:5173`_

#### 4. Access the Application

Open your browser and navigate to `http://localhost:5173`

----------

## Contributing

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

----------

## Acknowledgments

-   **CS50 Web Programming Course** - For the foundational knowledge
-   **Harvard University** - For the excellent curriculum
-   **Open Source Community** - For the amazing tools and libraries

----------

<div align="center">

**Built with ❤️ for CS50 Web Programming with Python and JavaScript**

[⭐ Star this repo](https://github.com/yourusername/keyflow) • [🐛 Report Bug](https://github.com/yourusername/keyflow/issues) • [💡 Request Feature](https://github.com/yourusername/keyflow/issues)

</div>