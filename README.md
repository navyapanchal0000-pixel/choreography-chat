# Choreography Chat

Build a real-time group chat app named "Choreography" with a premium UI, smooth animations, and a dark-mode aesthetic. 



Key Requirements:

1. Authentication & Login: 

- App opens directly to a Login Page with Email, Password, Show/Hide Password toggle, and a Login button.

- No self-registration. Users can only log in if pre-added by the Master User (max 40 users).

- Master User credentials are explicitly hardcoded: Email: navyapanchal0000@gmail.com and Password: 628922. Entering these exact credentials instantly directs the user straight to the Master administrator view.

- Entering valid Normal user credentials directs them to the Normal user view.



2. Main Group Chat Interface:

- Functions like a WhatsApp group where all messages sent by any user are instantly visible to everyone in real time.

- Bottom prompt box with a Send button and a `+` attachment icon.

- Tapping `+` opens a file picker to send images, photos, videos, and songs.



3. Normal User Flow:

- Logs in using the email and a strict 6-digit password set by the Master User.

- Header displays the user's assigned name. Tapping the name opens a modal showing all registered users and their live online/offline status.

- Sign-out process: Navigate to user list via name, tap sign-out, confirm via an "OK" popup modal.



4. Master User Administration Panel:

- Landing page is identical to the group chat but features a Three-Dot Menu in the header.

- Three-Dot Menu reveals: active user list, live online statuses, addition/sign-out history logs, and an "Add User" option.

- Add User fields: User Name, User Email, and a strict 6-digit User Password.

- Master User can manage, sign out, or delete users. 

- All data, messages, and user statuses must update in real time using WebSockets or Firebase.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2a2329ec-13a8-4995-bb3d-1cbbee01ba3a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
