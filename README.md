# Service Status Checker

A comprehensive service monitoring dashboard built with Next.js and HeroUI. This application monitors the status of your services and visualizes the data.

## Technologies Used

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [HeroUI v2](https://heroui.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Database Clients**: 
  - `pg` (PostgreSQL)
  - `oracledb` (Oracle Database)
- **Visualization**: [Recharts](https://recharts.org/)
- **Utilities**:
  - `ping` (Network monitoring)
  - `concurrently` (Task runner)
  - `date-fns` (Date utility)

## How to Use

### Installation

1.  Clone the repository.
2.  Install dependencies:

    ```bash
    npm install
    ```

### Configuration

Ensure you have the necessary environment variables set up in a `.env` file (e.g., database credentials, next-auth secret).

### Running the Application

This project consists of a valid Next.js web application and a background monitoring script.

**Development:**

Start both the web application and the monitoring script concurrently:

```bash
npm run dev
```

This will run:
*   Web App: `http://localhost:3000`
*   Monitor Script: `scripts/monitor.ts`

**Production:**

1.  Build the Next.js application:

    ```bash
    npm run build
    ```

2.  Start the production server and monitor:

    ```bash
    npm run prod
    ```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
