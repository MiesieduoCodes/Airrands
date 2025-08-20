import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, ActivityIndicator, Chip, IconButton, Button } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { getRunnerEarnings, subscribeToRunnerEarnings } from '../../services/runnerServices';

const EarningsScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completedErrands, setCompletedErrands] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [earningsBreakdown, setEarningsBreakdown] = useState({
    food: 0,
    grocery: 0,
    express: 0,
    package: 0,
    errand: 0
  });
  
  // Handle navigation parameters from notifications
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  // Handle route parameters when component mounts or route changes
  useEffect(() => {
    if (route?.params?.selectedPaymentId) {
      setSelectedPaymentId(route.params.selectedPaymentId);
      // Clear selection after 3 seconds
      setTimeout(() => setSelectedPaymentId(null), 3000);
    }
  }, [route?.params]);

  const periods = [
    { id: 'today', label: 'Today', icon: 'calendar-today' },
    { id: 'week', label: 'This Week', icon: 'calendar-week' },
    { id: 'month', label: 'This Month', icon: 'calendar-month' },
    { id: 'all', label: 'All Time', icon: 'calendar' },
  ];

  const fetchEarnings = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
    setLoading(true);
      // Use the new backend function
      const earningsData = await getRunnerEarnings(user.uid);
      
      setCompletedErrands(earningsData.completedErrands);
      setTotalEarnings(earningsData.totalEarnings);
      setTodayEarnings(earningsData.todayEarnings);
      setWeeklyEarnings(earningsData.weeklyEarnings);
      setMonthlyEarnings(earningsData.monthlyEarnings);
      setEarningsBreakdown(earningsData.earningsBreakdown);
      
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching earnings:', error);
        setLoading(false);
        setRefreshing(false);
    }
  }, [user?.uid]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = subscribeToRunnerEarnings(user.uid, (earningsData) => {
      setCompletedErrands(earningsData.completedErrands);
      setTotalEarnings(earningsData.totalEarnings);
      setTodayEarnings(earningsData.todayEarnings);
      
      // Calculate other periods from the real-time data
      const today = new Date();
      const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const weeklyTotal = earningsData.completedErrands.filter((errand: any) => {
        if (!errand.completedAt || !errand.completedAt.toDate) return false;
        const completedAt = errand.completedAt.toDate();
        return completedAt >= startOfWeek;
      }).reduce((sum: number, errand: any) => sum + (errand.fee || errand.amount || 0), 0);
      
      const monthlyTotal = earningsData.completedErrands.filter((errand: any) => {
        if (!errand.completedAt || !errand.completedAt.toDate) return false;
        const completedAt = errand.completedAt.toDate();
        return completedAt >= startOfMonth;
      }).reduce((sum: number, errand: any) => sum + (errand.fee || errand.amount || 0), 0);
      
      setWeeklyEarnings(weeklyTotal);
      setMonthlyEarnings(monthlyTotal);
      
      // Calculate breakdown
      const breakdown = {
        food: 0,
        grocery: 0,
        express: 0,
        package: 0,
        errand: 0,
      };
      
      earningsData.completedErrands.forEach((errand: any) => {
        const category = errand.category?.toLowerCase() || 'errand';
        const amount = errand.fee || errand.amount || 0;
        
        if (category.includes('food')) breakdown.food += amount;
        else if (category.includes('grocery')) breakdown.grocery += amount;
        else if (category.includes('express')) breakdown.express += amount;
        else if (category.includes('package')) breakdown.package += amount;
        else breakdown.errand += amount;
      });
      
      setEarningsBreakdown(breakdown);
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarnings();
  };

  const getSelectedEarnings = () => {
    switch (selectedPeriod) {
      case 'today': return todayEarnings;
      case 'week': return weeklyEarnings;
      case 'month': return monthlyEarnings;
      case 'all': return totalEarnings;
      default: return todayEarnings;
    }
  };

  const renderEarningsCard = ({ item }: { item: any }) => (
    <Animatable.View
      animation="fadeInUp"
      delay={100}
      duration={500}
    >
    <Card style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}>
      <Card.Content>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <MaterialCommunityIcons name="cash" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              ₦{(item.fee || item.amount || 0).toLocaleString()}
            </Text>
            <View style={{ marginLeft: 'auto' }}>
              <Chip 
                mode="outlined" 
                textStyle={{ fontSize: 10 }}
                style={{ height: 24 }}
              >
                {item.category || 'Errand'}
              </Chip>
            </View>
        </View>
          <Text style={{ color: theme.colors.onSurface, marginBottom: 4, fontWeight: '600' }}>
            {item.store?.name || item.title || 'Errand'}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4, fontSize: 12 }}>
            {item.customer?.address || item.deliveryAddress || 'Delivery Address'}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          {item.completedAt && item.completedAt.toDate ? item.completedAt.toDate().toLocaleString() : 'Completed'}
        </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="map-marker-distance" size={14} color={theme.colors.onSurfaceVariant} />
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginLeft: 4 }}>
                {item.distance || 'N/A'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </Animatable.View>
  );

  const renderBreakdownCard = (title: string, amount: number, icon: string, color: string) => (
    <Animatable.View
      animation="fadeInUp"
      delay={200}
      duration={500}
    >
      <Card style={{ 
        marginBottom: 8, 
        backgroundColor: theme.colors.surface,
        borderLeftWidth: 4,
        borderLeftColor: color,
      }}>
        <Card.Content style={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name={icon as any} size={24} color={color} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.onSurface, fontWeight: '600', fontSize: 14 }}>
                {title}
              </Text>
              <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 }}>
                ₦{amount.toLocaleString()}
              </Text>
            </View>
          </View>
      </Card.Content>
    </Card>
    </Animatable.View>
  );

  return (<SafeAreaView
      style={{
        flex: 1, backgroundColor: theme.colors.background, paddingTop: 45, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right}}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={theme.colors.primary} 
          />
        }
      >
        {/* Header */}
        <Animatable.View
          animation="fadeInDown"
          duration={500}
          style={{ padding: 16 }}
        >
          <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 8 }}>
            Earnings Dashboard
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            Track your earnings and performance
          </Text>
        </Animatable.View>

        {/* Period Selector */}
        <Animatable.View
          animation="fadeInUp"
          delay={100}
          duration={500}
          style={{ paddingHorizontal: 16, marginBottom: 16 }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {periods.map((period) => (<TouchableOpacity
                key={period.id}
                onPress={() => setSelectedPeriod(period.id)}
                style={{
                  marginRight: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selectedPeriod === period.id ? theme.colors.primary : theme.colors.surfaceVariant,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <MaterialCommunityIcons 
                  name={period.icon as any} 
                  size={16} 
                  color={selectedPeriod === period.id ? 'white' : theme.colors.onSurfaceVariant} 
                  style={{ marginRight: 6 }}
                />
                <Text style={{
                  color: selectedPeriod === period.id ? 'white' : theme.colors.onSurfaceVariant,
                  fontWeight: selectedPeriod === period.id ? '600' : '400',
                  fontSize: 14,
                }}>
                  {period.label}
            </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animatable.View>

        {/* Main Earnings Card */}
        <Animatable.View
          animation="fadeInUp"
          delay={200}
          duration={500}
          style={{ paddingHorizontal: 16, marginBottom: 24 }}
        >
          <Card style={{ backgroundColor: theme.colors.surface, elevation: 4 }}>
            <Card.Content style={{ padding: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <MaterialCommunityIcons name="cash" size={32} color={theme.colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                    {selectedPeriod === 'today' ? 'Today\'s Earnings' :
                     selectedPeriod === 'week' ? 'This Week\'s Earnings' :
                     selectedPeriod === 'month' ? 'This Month\'s Earnings' :
                     'Total Earnings'}
                  </Text>
                  <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold', marginTop: 4 }}>
                    ₦{getSelectedEarnings().toLocaleString()}
                  </Text>
                </View>
                  </View>
              
              <Divider style={{ marginVertical: 12 }} />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <MaterialCommunityIcons name="package-variant" size={24} color="#4CAF50" style={{ marginBottom: 4 }} />
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>Completed</Text>
                  <Text variant="titleMedium" style={{ color: "#4CAF50", fontWeight: 'bold' }}>
                    {completedErrands.length}
                  </Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <MaterialCommunityIcons name="clock-outline" size={24} color="#2196F3" style={{ marginBottom: 4 }} />
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>Average</Text>
                  <Text variant="titleMedium" style={{ color: "#2196F3", fontWeight: 'bold' }}>
                    ₦{completedErrands.length > 0 ? Math.round(getSelectedEarnings() / completedErrands.length).toLocaleString() : '0'}
                  </Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <MaterialCommunityIcons name="trending-up" size={24} color="#FF9800" style={{ marginBottom: 4 }} />
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>Best Day</Text>
                  <Text variant="titleMedium" style={{ color: "#FF9800", fontWeight: 'bold' }}>
                    ₦{Math.max(todayEarnings, weeklyEarnings / 7, monthlyEarnings / 30).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
        </Animatable.View>

        {/* Earnings Breakdown */}
        <Animatable.View
          animation="fadeInUp"
          delay={300}
          duration={500}
          style={{ paddingHorizontal: 16, marginBottom: 24 }}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 12 }}>
            Earnings by Category
          </Text>
          
          {renderBreakdownCard('Food Delivery', earningsBreakdown.food, 'food', '#FF5722')}
          {renderBreakdownCard('Grocery Delivery', earningsBreakdown.grocery, 'cart', '#4CAF50')}
          {renderBreakdownCard('Express Delivery', earningsBreakdown.express, 'lightning-bolt', '#FFC107')}
          {renderBreakdownCard('Package Delivery', earningsBreakdown.package, 'package-variant', '#2196F3')}
          {renderBreakdownCard('Errands', earningsBreakdown.errand, 'run-fast', '#9C27B0')}
        </Animatable.View>

        {/* Completed Errands List */}
        <Animatable.View
          animation="fadeInUp"
          delay={400}
          duration={500}
          style={{ paddingHorizontal: 16 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
              Recent Deliveries
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {completedErrands.length} completed
            </Text>
          </View>
          
          {loading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
                Loading earnings...
              </Text>
            </View>
          ) : completedErrands.length === 0 ? (
            <Card style={{ backgroundColor: theme.colors.surface, padding: 32, alignItems: 'center' }}>
              <MaterialCommunityIcons name="cash-multiple" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={{ color: theme.colors.onSurface, marginTop: 16, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                No completed errands yet
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontSize: 14, textAlign: 'center' }}>
                Complete your first delivery to start earning
              </Text>
            </Card>
          ) : (
            <FlatList
              data={completedErrands.slice(0, 10)} // Show only recent 10
              keyExtractor={item => item.id}
              renderItem={renderEarningsCard}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EarningsScreen; 