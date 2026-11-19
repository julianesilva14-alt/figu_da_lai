import * as Haptics from 'expo-haptics';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fonts, shadow } from '../theme';

export function Txt({
  weight = 'regular',
  style,
  ...props
}: TextProps & { weight?: keyof typeof fonts }) {
  return <Text {...props} style={[{ fontFamily: fonts[weight], color: colors.text }, style]} />;
}

type Variant = 'primary' | 'whatsapp' | 'soft' | 'ghost' | 'danger';

const variantStyle: Record<Variant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryDark, fg: '#fff' },
  whatsapp: { bg: colors.whatsapp, pressed: colors.whatsappDark, fg: '#fff' },
  soft: { bg: colors.primarySoft, pressed: '#FFD0DE', fg: colors.primaryDark },
  ghost: { bg: 'transparent', pressed: 'rgba(255,255,255,0.08)', fg: '#fff', border: 'rgba(255,255,255,0.25)' },
  danger: { bg: '#FFE4E4', pressed: '#FFD2D2', fg: '#C62828' },
};

export function Button({
  title,
  icon,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  big,
}: {
  title: string;
  icon?: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  big?: boolean;
}) {
  const v = variantStyle[variant];
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        big && styles.btnBig,
        {
          backgroundColor: pressed ? v.pressed : v.bg,
          borderColor: v.border ?? 'transparent',
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        (variant === 'primary' || variant === 'whatsapp') && !disabled && shadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Txt weight="semibold" style={[styles.btnText, big && styles.btnTextBig, { color: v.fg }]}>
          {icon ? `${icon}  ` : ''}
          {title}
        </Txt>
      )}
    </Pressable>
  );
}

type NameModalProps = {
  visible: boolean;
  title: string;
  initial?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
};

/** Caixinha para digitar um nome (o Alert.prompt só existe no iPhone). */
export function NameModal(props: NameModalProps) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onCancel}>
      {/* Montado só quando aberto, para o campo começar sempre com o valor inicial */}
      {props.visible && <NameForm {...props} />}
    </Modal>
  );
}

function NameForm({ title, initial = '', confirmLabel = 'Salvar', onCancel, onConfirm }: NameModalProps) {
  const [name, setName] = useState(initial);
  return (
    <Pressable style={styles.backdrop} onPress={onCancel}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        <Txt weight="bold" style={styles.sheetTitle}>
          {title}
        </Txt>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Lai sendo Lai 💅"
          placeholderTextColor={colors.muted}
          autoFocus
          maxLength={128}
          style={styles.input}
          onSubmitEditing={() => name.trim() && onConfirm(name)}
          returnKeyType="done"
        />
        <View style={styles.sheetRow}>
          <Button title="Cancelar" variant="soft" onPress={onCancel} style={{ flex: 1 }} />
          <Button title={confirmLabel} onPress={() => onConfirm(name)} disabled={!name.trim()} style={{ flex: 1 }} />
        </View>
      </Pressable>
    </Pressable>
  );
}

export function Chip({ children, color, bg }: { children: ReactNode; color: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Txt weight="medium" style={{ color, fontSize: 13 }}>
        {children}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  btnBig: { paddingVertical: 17 },
  btnText: { fontSize: 16 },
  btnTextBig: { fontSize: 18 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,22,49,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { backgroundColor: colors.surface, borderRadius: 28, padding: 22, gap: 16, ...shadow },
  sheetTitle: { fontSize: 22 },
  input: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  sheetRow: { flexDirection: 'row', gap: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
});
