import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  let tabBarStyle: any = {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF1F6',
    paddingTop: 4,
  };

  // 用于修复 Web 上高度异常的问题（这个 if 逻辑必须添加）
  if (Platform.OS === 'web') {
    tabBarStyle = { ...tabBarStyle, height: 'auto', paddingTop: 4 };
  }

  const ACTIVE = '#2563EB';
  const INACTIVE = '#94A3B8';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 name="house" size={20} color={color} solid={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: '债务',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 name="wallet" size={20} color={color} solid={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: '计划',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 name="calendar-week" size={20} color={color} solid={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: '记录',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 name="receipt" size={20} color={color} solid={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 name="gear" size={20} color={color} solid={focused} />
          ),
        }}
      />
    </Tabs>
  );
}