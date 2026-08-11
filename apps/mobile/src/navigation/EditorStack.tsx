import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { EditorHomeScreen } from '../screens/editor/EditorHomeScreen';
import { SectionEditScreen } from '../screens/editor/SectionEditScreen';
import { AtsResultScreen } from '../screens/editor/AtsResultScreen';
import { ExportStatusScreen } from '../screens/editor/ExportStatusScreen';
import type { EditorStackParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<EditorStackParamList>();

type Props = {
  route: RouteProp<RootStackParamList, 'Editor'>;
};

export function EditorStack({ route }: Props) {
  const cvId = route.params?.cvId ?? 'unknown';

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="EditorHome"
        component={EditorHomeScreen}
        initialParams={{ cvId }}
        options={{ title: 'Editor' }}
      />
      <Stack.Screen
        name="SectionEdit"
        component={SectionEditScreen}
        options={{ title: 'Edit section' }}
      />
      <Stack.Screen name="AtsResult" component={AtsResultScreen} options={{ title: 'ATS score' }} />
      <Stack.Screen
        name="ExportStatus"
        component={ExportStatusScreen}
        options={{ title: 'Export' }}
      />
    </Stack.Navigator>
  );
}
