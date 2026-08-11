import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/home/DashboardScreen';
import { CvListScreen } from '../screens/home/CvListScreen';
import { TemplatesScreen } from '../screens/templates/TemplatesScreen';
import { AIHubScreen } from '../screens/editor/AIHubScreen';
import { AccountScreen } from '../screens/account/AccountScreen';
import { colors } from '../theme/tokens';
import type { HomeStackParamList, MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'CV Studio AI', headerLargeTitle: true }}
      />
      <HomeStack.Screen name="CvList" component={CvListScreen} options={{ title: 'My CVs' }} />
    </HomeStack.Navigator>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.slate500,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: 'Home' }} />
      <Tab.Screen
        name="TemplatesTab"
        component={TemplatesScreen}
        options={{ title: 'Templates', headerShown: true }}
      />
      <Tab.Screen
        name="AITab"
        component={AIHubScreen}
        options={{ title: 'AI', headerShown: true }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{ title: 'Account', headerShown: true }}
      />
    </Tab.Navigator>
  );
}
