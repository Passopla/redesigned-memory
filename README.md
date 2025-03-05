# My V0 Project - Tweet Time Machine

This project is designed to help you explore your Twitter history by uploading your Twitter archive. With the Tweet Time Machine, you can view your past tweets, filter them by time range, and even hide retweets and replies for a more personalized experience.

## Table of Contents

- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Dependencies](#dependencies)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

To get started with the project, you'll need to have Node.js and npm installed on your machine. Follow these steps to set up the project:

1. **Clone the repository:**

   \\\ash
   git clone https://github.com/Passopla//redesigned-memory.git
   
   cd redesigned-memory
   \\\

3. **Install dependencies:**

   Run the following command to install all necessary dependencies:

   \\\ash
   npm install
   \\\

4. **Run the development server:**

   Start the development server with:

   \\\ash
   npm run dev
   \\\

   This will start the server on [http://localhost:3000](http://localhost:3000).

## Scripts

The project includes several npm scripts for common tasks:

- **\
pm run dev\**: Starts the development server.
- **\
pm run build\**: Builds the application for production.
- **\
pm run start\**: Starts the production server.
- **\
pm run lint\**: Runs ESLint to check for code quality issues.

## Project Structure

The project follows a typical Next.js structure:

- **\pages/\**: Contains the application's pages. Each file in this directory corresponds to a route.
- **\public/\**: Static files like images and fonts.
- **\styles/\**: Contains global styles and CSS modules.
- **\components/\**: Reusable React components.
- **\
ext.config.mjs\**: Configuration file for Next.js.

## Key Features

- **Upload Twitter Archive**: Upload your \	tweets.js\ file to view your past tweets.
- **Filter Tweets**: Filter tweets by time range (all time, recent, year, month, balanced).
- **Hide Retweets and Replies**: Option to hide retweets and replies for a cleaner view.
- **Random Tweet Display**: Display a random tweet from your archive based on selected filters.

## Dependencies

The project uses several key dependencies:

- **Next.js**: The React framework for production.
- **React**: A JavaScript library for building user interfaces.
- **Tailwind CSS**: A utility-first CSS framework for styling.
- **Radix UI**: A set of accessible, unstyled components for building UI.

For a complete list of dependencies, see the \package.json\ file.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.
