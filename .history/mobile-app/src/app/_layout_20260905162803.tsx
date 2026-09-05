import { Stack } from "expo-router";
2
import { ReportsProvider } from "../src/context/ReportsContext";
3
 
4
export default function RootLayout() {
5
return (
6
<ReportsProvider>
7
<Stack
8
screenOptions={{
9
headerShown: false,
10
}}
11
/>
12
</ReportsProvider>
13
);
14
}